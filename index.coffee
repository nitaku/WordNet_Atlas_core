
### GLOBAL SETTINGS, SVG and panels ###

# width = 1024
# height = 620

# side_width = 80
# bottom_height = 80

svg = d3.select('body').append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    
svg_bbox = svg[0][0].getBoundingClientRect()

### main visualization (map view from the top) ###
global_scale = 0.2
vis = svg.append('g')
map = vis.append('g')
    .attr('transform', "translate(#{svg_bbox.width/2},#{svg_bbox.height/2}), scale(#{global_scale})")
    # .attr('transform', "translate(#{(width-side_width)/2},#{(height-bottom_height)/2}), scale(#{global_scale}), scale(1,#{1/Math.sqrt(3)}), rotate(45)")
    
### side map (view from the side) ###
# svg.append('rect')
    # .attr('class', 'panel')
    # .attr('width', side_width)
    # .attr('height', height)
    # .attr('transform', "translate(#{width-side_width},0)")
    
# side = svg.append('g')
# side_map = side.append('g')
    # .attr('transform', "translate(#{width-side_width},#{(height-bottom_height)/2}), scale(1,#{global_scale})")
    
### bottom map (view from the front) ###
# svg.append('rect')
    # .attr('class', 'panel')
    # .attr('width', width)
    # .attr('height', bottom_height)
    # .attr('transform', "translate(0,#{height-bottom_height})")
    
# bottom = svg.append('g')
# bottom_map = bottom.append('g')
    # .attr('transform', "translate(#{(width-side_width)/2},#{height-bottom_height}), scale(#{global_scale},1)")
    
### hide the bottom-right corner ###
# svg.append('rect')
    # .attr('x', width-side_width)
    # .attr('y', height-bottom_height)
    # .attr('width', side_width)
    # .attr('height', bottom_height)
    # .attr('fill', 'white')
    
    
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
        # side.attr('transform', "translate(0, #{translation[1]})scale(1,#{zoom.scale()})")
        # bottom.attr('transform', "translate(#{translation[0]}, 0)scale(#{zoom.scale()},1)")
        tooltip.attr('transform', "scale(#{1/scale})")
        lod_update(scale)
        
### bind the zoom behavior to the main SVG ###
svg.call(zoom)


### DATA ###

console.debug 'Getting data...'
d3.json 'wnen30_core_n_longest.json', (graph) ->
    
    ### objectify the graph ###
    console.debug 'Indexing nodes...'
    index = {}
    for n in graph.nodes
        index[n.id] = n
        
    console.debug 'Objectifying the graph and constructing the tree...'
    ### resolve node IDs ###
    for l in graph.links
        l.source = index[l.source]
        l.target = index[l.target]
        
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
    tree = index[100001740] # this is the synsetid of 'entity'
    
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
    sfc_layout.displace(leaves, sfc_layout.HILBERT, scale, scale*1/Math.sqrt(3), Math.PI/4)
    
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
    # console.debug 'Computing the orthogonal projections for depthmaps...'
    # projs = {
        # front: orthoproj.depth_projs(leaves, 'x'),
        # side: orthoproj.depth_projs(leaves, 'y')
    # }
    
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
        
    console.debug 'Computing the jigsaw treemap...'
    ### compute all the internal nodes regions ###
    jigsaw.treemap(tree, scale, jigsaw.ISO_CELL)
    
    console.debug 'Drawing...'
    ### define the level zero region (the land) ###
    defs = svg.append('defs')

    # defs.append('path')
        # .attr('id', 'land')
        # .attr('d', jigsaw.get_svg_path tree.region)
        
    ### faux land glow (using filters takes too much resources) ###
    # map.append('use')
        # .attr('class', 'land-glow-outer')
        # .attr('xlink:href', '#land')
        
    # map.append('use')
        # .attr('class', 'land-glow-inner')
        # .attr('xlink:href', '#land')
        
    ### draw the cells ###
    cells = map.selectAll('.cell')
        .data(leaves)
      .enter().append('path')
        .attr('class', 'cell')
        .attr('d', jigsaw.iso_generate_svg_path(scale))
        .attr('transform', (d) -> "translate(#{d.x},#{d.y})")
        .attr('fill', (d) -> depth_color(d.depth))
        .on('mouseenter', (d) ->
            tooltip_g
                .attr('transform', "translate(#{d.x},#{d.y-scale*0.5})")
            tooltip
                .text("#{d.lemma}")
        )
        .on('mouseleave', () -> tooltip.text(''))
        
    ### draw boundaries ###
    depth2boundary_width = (x) -> (20-0.2)/Math.pow(2,x)+0.2
    
    old_highlighted_depth = null
    regions = map.selectAll('.region')
        .data(nodes.filter((d)->d.type is 'synset').sort((a,b)->b.depth-a.depth)) # stack regions in depth order
      .enter().append('path')
        .attr('class', 'region')
        .attr('d', (d) -> jigsaw.get_svg_path d.region)
        .attr('stroke-width', (d) -> if d.depth == 0 then depth2boundary_width(d.depth+1) else depth2boundary_width(d.depth)) # level zero boundary is equal to level one
        .attr('stroke', 'white')
        .on('click', (d) ->
            if not old_highlighted_depth? or old_highlighted_depth != d.depth
                regions.filter((r)->r.depth <= d.depth).attr('stroke', '#444')
                regions.filter((r)->r.depth > d.depth).attr('stroke', 'white')
                old_highlighted_depth = d.depth
            else
                regions.attr('stroke', 'white')
                old_highlighted_depth = null
        )
        
    ### draw the land border (above cells and boundaries) ###
    # map.append('use')
        # .attr('class', 'land-fill')
        # .attr('xlink:href', '#land')
        
    ### draw the graph links ###
    # map.selectAll('.graph_link')
        # .data(bundles)
      # .enter().append('path')
        # .attr('class', 'graph_link')
        # .attr('d', link_generator)
        
    ### draw the graph links ###
    # map.selectAll('.graph_link')
        # .data(graph.links.filter((d)->d.is_tree_link and d.source.depth < 2))
      # .enter().append('line')
        # .attr('class', 'graph_link')
        # .attr('x1', (d)->d.source.x)
        # .attr('y1', (d)->d.source.y)
        # .attr('x2', (d)->d.target.x)
        # .attr('y2', (d)->d.target.y)
        # .attr('stroke', (d)->if d.is_tree_link then 'teal' else 'orange')
        # .attr('stroke-width', (d)->(tree.height-d.source.depth+1)*0.05)
        
    ### draw region labels ###
    cells2fontsize = d3.scale.pow()
        .exponent(0.4)
        .domain([1, leaves.length])
        .range([2,150])
        
    region_labels = map.selectAll('.region_label')
        .data(nodes.filter((d)->d.type is 'synset'))
      .enter().append('text')
        .attr('class', 'region_label')
        .attr('font-size', (d) -> cells2fontsize(d.leaf_descendants.length))
        .attr('dy', '0.35em')
        .attr('transform', (d) -> "translate(#{d.x},#{d.y}), scale(1, #{1/Math.sqrt(3)}), rotate(45)")
        .text((d) -> d.senses[0].lemma) # first sense is the most common
        
    ### draw the leaf labels ###
    leaf_labels = map.selectAll('.leaf_label')
        .data(leaves)
      .enter().append('text')
        .attr('class', 'leaf_label')
        .attr('font-size', (d) -> if d.is_core then 3.5 else 2.5)
        .attr('dy', '0.35em')
        .attr('transform', (d) -> "translate(#{d.x},#{d.y})")
        .text((d) -> "#{d.lemma}")
        .attr('font-weight', (d) -> if d.is_core then 'bold' else 'normal')
        .attr('display', 'none')
        
        
    ### ORTHOGONAL PROJECTIONS ###

    ### FIXME define a width scale for leaf depth ###
    # margin = 8
    # side_range = side_width - margin*2
    # side_step = side_range / (tree.height-1)

    # side_map.selectAll('.proj_node')
        # .data(projs.side)
      # .enter().append('rect')
        # .attr('class', 'proj_node')
        # .attr('x', (d) -> margin + side_range*(d.depth-1)/(tree.height-1))
        # .attr('y', (d) -> d.y-scale/2)
        # .attr('width', side_step)
        # .attr('height', scale)
        # .attr('fill', (d) -> depth_color(d.depth))
        # .attr('stroke', (d) -> depth_color(d.depth))
        
    # front_range = bottom_height - margin*2
    # front_step = front_range / (tree.height-1)

    # bottom_map.selectAll('.proj_node')
        # .data(projs.front)
      # .enter().append('rect')
        # .attr('class', 'proj_node')
        # .attr('x', (d) -> d.x-scale/2)
        # .attr('y', (d) -> margin + front_range*(d.depth-1)/(tree.height-1))
        # .attr('width', scale)
        # .attr('height', front_step)
        # .attr('fill', (d) -> depth_color(d.depth))
        # .attr('stroke', (d) -> depth_color(d.depth))
        
    ### capitals ###
    # map.selectAll('.capital')
        # .data(nodes.filter((d) -> d.type is 'synset' and d.depth in [0,1]))
      # .enter().append('g')
        # .attr('class', 'capital')
      # .selectAll('.capital_cell')
        # .data((d) -> d.senses)
      # .enter().append('rect')
        # .attr('class', 'capital_cell')
        # .attr('x', (d) -> d.x-scale/2)
        # .attr('y', (d) -> d.y-scale/2)
        # .attr('width', scale)
        # .attr('height', scale)
        
        
    ### TOOLTIP ###
    this.tooltip_g = map.append('g')
    this.tooltip = tooltip_g.append('text')
        .attr('class', 'tooltip')
        .attr('dy', '-0.35em')
        .attr('font-size', 16/global_scale)
        
    ### LOD ###
    ### update Level Of Detail ###
    last_iz = -1
    LEAF_Z = 13
    
    this.lod_update = (z) ->
        # lod is not always updated
        Z_LEVELS = tree.height-2
        iz = Math.floor(Z_LEVELS*(z)/(LEAF_Z-1))
        # console.log "z: #{z}   iz: #{iz}"
        if iz != last_iz
            regions
                # .attr('display', (d) -> if d.leaf_descendants.length*z*z*z > 5000 then 'inline' else 'none')
                .attr('display', (d) -> if d.depth <= iz then 'inline' else 'none')
                
            region_labels
                .attr('display', (d) -> if d.depth <= iz then 'inline' else 'none')
                .attr('fill-opacity', (d) -> if d.depth == iz then 0.5 else if d.height == 2 then 0.5 else 0.1)
                # .attr('display', (d) -> if d.leaf_descendants.length*z*z*z > 5000 then 'inline' else 'none')
                # .attr('fill-opacity', (d) -> if d.leaf_descendants.length*z*z*z > 7000 then 0.5*7000/(d.leaf_descendants.length*z*z*z) else 0.5)
                
            if z >= LEAF_Z
                region_labels.attr('fill-opacity', 0.1)
                leaf_labels.attr('display', 'inline')
                tooltip.attr('display', 'none')
            else
                region_labels.attr('fill-opacity', (d) -> if d.depth == iz then 0.5 else if d.height == 2 then 0.5 else 0.1) # same as above
                leaf_labels.attr('display', 'none')
                tooltip.attr('display', 'inline')
                
            last_iz = iz
    lod_update(1)
    