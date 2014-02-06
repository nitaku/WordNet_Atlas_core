
### GLOBAL SETTINGS, SVG and panels ###

width = 1024
height = 620

side_width = 80
bottom_height = 80

svg = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height)
    
### main visualization (map view from the top) ###
global_scale = 0.1
vis = svg.append('g')
map = vis.append('g')
    .attr('transform', "translate(#{(width-side_width)/2},#{(height-bottom_height)/2}), scale(#{global_scale})")
    
### side map (view from the side) ###
svg.append('rect')
    .attr('class', 'panel')
    .attr('width', side_width)
    .attr('height', height)
    .attr('transform', "translate(#{width-side_width},0)")
    
side = svg.append('g')
side_map = side.append('g')
    .attr('transform', "translate(#{width-side_width},#{(height-bottom_height)/2}), scale(1,#{global_scale})")
    
### bottom map (view from the front) ###
svg.append('rect')
    .attr('class', 'panel')
    .attr('width', width)
    .attr('height', bottom_height)
    .attr('transform', "translate(0,#{height-bottom_height})")
    
bottom = svg.append('g')
bottom_map = bottom.append('g')
    .attr('transform', "translate(#{(width-side_width)/2},#{height-bottom_height}), scale(#{global_scale},1)")
    
### hide the bottom-right corner ###
svg.append('rect')
    .attr('x', width-side_width)
    .attr('y', height-bottom_height)
    .attr('width', side_width)
    .attr('height', bottom_height)
    .attr('fill', 'white')

    
### ZUI ###

### define a zoom behavior ###
zoom = d3.behavior.zoom()
    .scaleExtent([1,100]) # min-max zoom
    .on 'zoom', () ->
        ### whenever the user zooms, ###
        ### modify translation and scale of the zoom group accordingly ###
        translation = zoom.translate()
        scale = zoom.scale()
        vis.attr('transform', "translate(#{translation})scale(#{scale})")
        side.attr('transform', "translate(0, #{translation[1]})scale(1,#{zoom.scale()})")
        bottom.attr('transform', "translate(#{translation[0]}, 0)scale(#{zoom.scale()},1)")
        lod_update(scale)
        
### bind the zoom behavior to the main SVG ###
svg.call(zoom)


### DATA ###

console.debug 'Getting data...'
d3.json 'wnen30_core_n_longest.json', (graph) ->
    
    ### objectify the graph ###
    ### resolve node IDs (not optimized at all!) ###
    console.debug 'Objectifying the graph and constructing the tree...'
    for l in graph.links
        for n in graph.nodes
            if l.source is n.id
                l.source = n
                
            if l.target is n.id
                l.target = n
                
        ### convert the graph into a tree ###
        if l.is_tree_link? and l.is_tree_link
            if not l.source.children?
                l.source.children = []
                
            l.source.children.push l.target
            
        ### store senses also in a different structure ###
        if l.target.type == 'sense'
            # ASSERT sources are synsets
            if not l.source.senses?
                l.source.senses = []
                
            l.source.senses.push l.target
            
    ### find the root of the tree ###
    console.debug 'Finding the root...'
    for n in graph.nodes
        if n.id == 100001740 # this is the synsetid of 'entity'
            tree = n
            
    console.debug 'Computing d3 hierarchy layout...'
    hierarchy = d3.layout.hierarchy()
    nodes = hierarchy(tree)
    
    ### sort the senses by sensenum ###
    console.debug 'Sorting senses...'
    for n in nodes
        if n.type == 'synset'
            n.senses.sort((a,b)->b.sensenum-a.sensenum)
    
    ### this tree is unordered, we need a canonical ordering for it ###
    console.debug 'Computing canonical sort...'
    tree_utils.canonical_sort(tree)
    
    
    ### obtain the sequence of leaves ###
    leaves = tree_utils.get_leaves(tree)

    ### compute the subtree height for each node ###
    console.debug 'Computing subtrees height...'
    tree_utils.compute_height(tree)
    
    
    ### VISUALIZATION ###
    
    ### compute the space-filling curve layout ###
    console.debug 'Computing the Space-Filling Curve layout...'
    scale = 26
    sfc_layout.displace(leaves, sfc_layout.HILBERT, scale, 0)
    
    ### compute also the position of internal nodes ###
    console.debug 'Computing the position of internal nodes...'
    sfc_layout.displace_tree(tree)

    ### define a bundle layout ###
    # console.debug 'Computing the d3 bundle layout...'
    # bundle = d3.layout.bundle()
    # bundles = bundle(graph.links.filter((l)->not l.tree_link))

    # link_generator = d3.svg.line()
        # .interpolate('bundle')
        # .tension(0.99)
        # .x((d) -> d.x)
        # .y((d) -> d.y)
        
    ### group leaves by depth ###
    console.debug 'Computing the orthogonal projections for depthmaps...'
    projs = {
        front: orthoproj.depth_projs(leaves, 'x'),
        side: orthoproj.depth_projs(leaves, 'y')
    }
    
    console.debug 'Almost ready to draw...'
    
    ### define a color scale for leaf depth ###
    whiteness = 0.4
    whiten = (color) -> d3.interpolateHcl(color, d3.hcl(undefined,0,100))(whiteness)
    depth_color = d3.scale.linear()
        .domain([1, d3.max(leaves,(d)->d.depth)])
        .range(['#AEFCA1', '#605D75'].map(whiten))
        .interpolate(d3.interpolateHcl)
        
    ### define a thickness scale for region height ###
    # height2thickness = d3.scale.linear()
        # .domain([1, tree.height])
        # .range([0.001, 1])
        
    ### translate size to cell scale ###
    # size2cellscale = d3.scale.sqrt()
        # .domain([0, d3.max(nodes,(d)->d.size)])
        # .range([0,scale])
        
    ### translate cells to label font size ###
    cells2fontsize = d3.scale.pow()
        .exponent(0.4)
        .domain([1, leaves.length])
        .range([4,200])
        
    ### compute all the internal nodes regions ###
    jigsaw.treemap(tree, scale, jigsaw.SQUARE_CELL)

    ### define the level zero region (the land) ###
    defs = svg.append('defs')

    defs.append('path')
        .attr('id', 'land')
        .attr('d', jigsaw.get_svg_path tree.region)
        
    ### faux land glow (using filters takes too much resources) ###
    map.append('use')
        .attr('class', 'land-glow-outer')
        .attr('xlink:href', '#land')
        
    map.append('use')
        .attr('class', 'land-glow-inner')
        .attr('xlink:href', '#land')
        
    ### draw the cells ###
    cells = map.selectAll('.cell')
        .data(leaves)
      .enter().append('rect')
        .attr('class', 'cell')
        .attr('x', (d) -> d.x-scale/2)
        .attr('y', (d) -> d.y-scale/2)
        .attr('width', scale)
        .attr('height', scale)
        .attr('fill', (d) -> depth_color(d.depth))
        
    ### draw boundaries ###
    regions = map.selectAll('.region')
        .data(nodes.filter((d)->d.type is 'synset').reverse()) # draw regions in reverse, to avoid boundary overwrite
      .enter().append('path')
        .attr('class', 'region')
        .attr('d', (d) -> jigsaw.get_svg_path d.region)
        
    ### draw the land border (above cells and boundaries) ###
    map.append('use')
        .attr('class', 'land-fill')
        .attr('xlink:href', '#land')
        
    ### draw the graph links ###
    # map.selectAll('.graph_link')
        # .data(bundles)
      # .enter().append('path')
        # .attr('class', 'graph_link')
        # .attr('d', link_generator)
        
    ### draw the graph links ###
    # map.selectAll('.graph_link')
        # .data(graph.links)
      # .enter().append('line')
        # .attr('class', 'graph_link')
        # .attr('x1', (d)->d.source.x)
        # .attr('y1', (d)->d.source.y)
        # .attr('x2', (d)->d.target.x)
        # .attr('y2', (d)->d.target.y)
        # .attr('stroke', (d)->if d.is_tree_link then 'teal' else 'orange')
        
    ### draw labels ###
    labels = map.selectAll('.label')
        .data(nodes.filter((d)->d.type is 'synset'))
      .enter().append('text')
        .attr('class', 'label')
        .attr('font-size', (d) -> cells2fontsize(d.leaf_descendants.length))
        .attr('dy', '0.35em')
        .attr('transform', (d) -> "translate(#{d.x},#{d.y})")
        .text((d) -> (s.lemma for s in d.senses).join(', '))
        
    ### draw the leaf labels ###
    # leaf_labels = map.selectAll('.leaf_label')
        # .data(leaves)
      # .enter().append('text')
        # .attr('class', 'leaf_label')
        # .attr('font-size', '2.5')
        # .attr('dy', '0.35em')
        # .attr('transform', (d) -> "translate(#{d.x},#{d.y})")
        # .text((d) -> "#{d.lemma}[#{d.sensenum}]")
        # .attr('font-weight', (d) -> if d.is_core then 'bold' else 'normal')
        # .attr('display', 'none')
        
        
    ### ORTHOGONAL PROJECTIONS ###

    ### FIXME define a width scale for leaf depth ###
    margin = 8
    side_range = side_width - margin*2
    side_step = side_range / (tree.height-1)

    side_map.selectAll('.proj_node')
        .data(projs.side)
      .enter().append('rect')
        .attr('class', 'proj_node')
        .attr('x', (d) -> margin + side_range*(d.depth-1)/(tree.height-1))
        .attr('y', (d) -> d.y-scale/2)
        .attr('width', side_step)
        .attr('height', scale)
        .attr('fill', (d) -> depth_color(d.depth))
        .attr('stroke', (d) -> depth_color(d.depth))
        
    front_range = bottom_height - margin*2
    front_step = front_range / (tree.height-1)

    bottom_map.selectAll('.proj_node')
        .data(projs.front)
      .enter().append('rect')
        .attr('class', 'proj_node')
        .attr('x', (d) -> d.x-scale/2)
        .attr('y', (d) -> margin + front_range*(d.depth-1)/(tree.height-1))
        .attr('width', scale)
        .attr('height', front_step)
        .attr('fill', (d) -> depth_color(d.depth))
        .attr('stroke', (d) -> depth_color(d.depth))
        
    ### capitals ###
    map.selectAll('.capital')
        .data(nodes.filter((d) -> d.type is 'synset' and d.depth in [0,1]))
      .enter().append('g')
        .attr('class', 'capital')
      .selectAll('.capital_cell')
        .data((d) -> d.senses)
      .enter().append('rect')
        .attr('class', 'capital_cell')
        .attr('x', (d) -> d.x-scale/2)
        .attr('y', (d) -> d.y-scale/2)
        .attr('width', scale)
        .attr('height', scale)
        
    ### LOD ###
    ### update Level Of Detail ###
    last_z = -1
    
    this.lod_update = (z) ->
        th_depth = Math.floor(z/2)+1
        if th_depth != Math.floor(last_z/2)+1
            regions
                .attr('display', (d) -> if d.depth <= th_depth then 'inline' else 'none')
                .attr('stroke-width', (d) -> if d.depth < th_depth then '2px' else '1px')
                
            labels
                .attr('fill-opacity', (d) -> if d.depth < th_depth then 0.2 else 1)
                .attr('display', (d) -> if d.depth <= th_depth then 'inline' else 'none')
                
        last_z = z
        
    lod_update(1)
    