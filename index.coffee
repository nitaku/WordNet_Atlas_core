
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
    .scaleExtent([0.5,100]) # min-max zoom
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

app_url = String(document.URL).split('#')
lang = app_url[app_url.length-1] 
if lang.length != 3
    url = 'wnen30_core_n_longest.json'
    console.debug 'Getting data for English...'
else
    url = "multilingual/wnen30_core_n_longest_#{lang}.json"
    console.debug "Getting data for #{lang}..."

d3.json url, (graph) ->
    
    ### objectify the graph ###
    console.debug 'Indexing nodes...'
    index = {}
    for n in graph.nodes
        index[n.id] = n
        
        if n.type is 'synset'
            n.senses = []
            
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
            l.source.senses.push l.target
            
    ### find the root of the tree ###
    console.debug 'Finding the root...'
    tree = index[100001740] # this is the synsetid of 'entity'
    
    console.debug 'Computing d3 hierarchy layout...'
    hierarchy = d3.layout.hierarchy()
    nodes = hierarchy(tree)
    
    ### sort the senses FIXME this is not a good ordering - we should get the tagcount column ###
    console.debug 'Sorting senses...'
    for n in nodes
        if n.type == 'synset'
            n.senses.sort((a,b)->a.id-b.id)
    
    ### this tree is unordered, we need a canonical ordering for it ###
    console.debug 'Computing canonical sort...'
    tree_utils.canonical_sort(tree)
    
    console.debug 'Computing leaf descendants...'
    tree_utils.compute_leaf_descendants(tree)
    

    ### compute the subtree height for each node ###
    console.debug 'Computing subtrees height...'
    tree_utils.compute_height(tree)
    
    
    console.debug 'Placing capitals in the middle of their region...'
    capital_placement = (node) ->
        ### skip leaf synsets ###
        if node.height <= 2
            return
            
        ### place the sense nodes about into the middle of the children array ###
        node.children = node.children.filter((d) -> d.type is 'synset')
        m = d3.sum(node.children, (d)->d.leaf_descendants.length) / 2
        
        cut = null
        cut_dist = m
        for i in [0...node.children.length]
            left = node.children.slice(0,i)
            right = node.children.slice(i)
            left_size = d3.sum(left, (d)->d.leaf_descendants.length)
            right_size = d3.sum(left, (d)->d.leaf_descendants.length)
            
            dist = Math.min(Math.abs(m-left_size), Math.abs(m-right_size))
            
            if dist < cut_dist
                cut_dist = dist
                cut = i
                
        node.children = node.children.slice(0,cut).concat(node.senses.concat(node.children.slice(cut)))
        
        ### recur ###
        for child in node.children
            capital_placement(child)
            
    capital_placement(tree)
    
    ### obtain the sequence of leaves ###
    leaves = tree_utils.get_leaves(tree)
    
    
    ### VISUALIZATION ###
    
    ### compute the space-filling curve layout ###
    console.debug 'Computing the Space-Filling Curve layout...'
    scale = 26
    translation = sfc_layout.displace(leaves, sfc_layout.PEANO, scale, scale, 0)
    
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
    
    console.debug 'Grouping nodes by depth...'
    levels = []
    for depth in [0..tree.height]
        levels.push []
        
    for node in nodes
        levels[node.depth].push node
        
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
    jigsaw.treemap(tree, scale, jigsaw.SQUARE_CELL)
    
    console.debug 'Computing label placement...'
    jigsaw.hilbert_labels(tree, scale, translation)
    
    
    console.debug 'Drawing...'
    ### define the level zero region (the land) ###
    # defs = svg.append('defs')

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
        
    ### draw the land border (below cells and boundaries) ###
    # map.append('use')
        # .attr('class', 'land-fill')
        # .attr('xlink:href', '#land')
        
    ### draw the cells ###
    cells_g = map.append('g')
    cells = cells_g.selectAll('.cell')
        .data(leaves)
      .enter().append('path')
        .attr('class', 'cell')
        .attr('d', jigsaw.square_generate_svg_path(scale))
        .attr('transform', (d) -> "translate(#{d.x},#{d.y})")
        .attr('fill', (d) -> depth_color(d.depth))
        #.attr('fill', '#93cddc')
        .on('mouseenter', (d) ->
            return if (d3.event.defaultPrevented)
            
            tooltip_g
                .attr('transform', "translate(#{d.x},#{d.y-scale*0.5})")
            tooltip
                .text("#{if d.lemma? then d.lemma else '?'}")
        )
        .on('mouseleave', () -> tooltip.text(''))
        
    ### draw boundaries ###
    depth2width = (x) -> (20-0.2)/Math.pow(2,x)+0.2
    
    old_highlighted_depth = null
    regions_g = map.append('g')
    regions_levels = regions_g.selectAll('.level')
        .data(levels)
      .enter().append('g')
        .attr('class', 'level')
        
    regions_levels.selectAll('.region')
        .data((level) -> level.filter((d)->d.type is 'synset')) # regions are in depth order
      .enter().append('path')
        .attr('class', 'region')
        .attr('d', (d) -> jigsaw.get_svg_path d.region)
        .attr('stroke-width', (d) -> if d.depth == 0 then depth2width(d.depth+1) else depth2width(d.depth)) # level zero boundary is equal to level one
        .attr('stroke', 'white')
        .on('click', (d) ->
            return if (d3.event.defaultPrevented)
            
            if not old_highlighted_depth? or old_highlighted_depth != d.depth
                regions.filter((r)->r.depth <= d.depth).attr('stroke', '#444')
                regions.filter((r)->r.depth > d.depth).attr('stroke', 'white')
                old_highlighted_depth = d.depth
            else
                regions.attr('stroke', 'white')
                old_highlighted_depth = null
        )
        
        
    ### draw the graph links ###
    # map.selectAll('.graph_link')
        # .data(bundles)
      # .enter().append('path')
        # .attr('class', 'graph_link')
        # .attr('d', link_generator)
        
    ### draw the graph links ###
    # TENSION = 1
    # graph_links_g = map.append('g')
    # graph_links = graph_links_g.selectAll('.graph_link')
        # .data(graph.links.filter((d)->d.source.type is 'synset' and d.target.type is 'synset'))
      # .enter().append('path')
        # .attr('class', 'graph_link')
        # .attr('d', (d) ->
            # if d.source.senses.length > 0
                # x1 = d.source.senses[0].x
                # y1 = d.source.senses[0].y
            # else
                ## this is a synset without senses (could happen in non-English langs)
                # x1 = d.source.x
                # y1 = d.source.y
                
            # if d.target.senses.length > 0
                # x2 = d.target.senses[0].x
                # y2 = d.target.senses[0].y
            # else
                ## this is a synset without senses (could happen in non-English langs)
                # x2 = d.target.x
                # y2 = d.target.y
                
            # ### parent coordinates ###
            # if d.source.parent?
                # px = d.source.parent.senses[0].x
                # py = d.source.parent.senses[0].y
                # l = Math.sqrt(Math.pow(x1-px,2)+Math.pow(y1-py,2))
                # d = Math.sqrt(Math.pow(x2-x1,2)+Math.pow(y2-y1,2))
                # dcx = (x1-px)/l*d/TENSION
                # dcy = (y1-py)/l*d/TENSION
            # else
                # dcx = 0
                # dcy = 0
                
            # return "M#{x1} #{y1} C#{x1} #{y1-40*depth2width(d.source.depth)} #{x2} #{y2-40*depth2width(d.source.depth)} #{x2} #{y2}"
        # )
        # .attr('stroke-width', (d) -> depth2width(d.source.depth)*global_scale+0.1)
        
    ### draw region labels ###
    # cells2fontsize = d3.scale.pow()
        # .exponent(0.4)
        # .domain([1, leaves.length])
        # .range([2,150])
        
    LABEL_SCALE = 0.6
    region_labels_g = map.append('g')
        .attr('transform', "translate(#{translation.dx},#{translation.dy})")
        # .attr('transform', "translate(#{translation.dx},#{translation.dy}), scale(1, #{1/Math.sqrt(3)}), rotate(-45)")
        
    region_labels_levels = region_labels_g.selectAll('.level')
        .data(levels)
      .enter().append('g')
        .attr('class', 'level')
        
    region_labels_levels.selectAll('.region_label')
        .data((level) -> level.filter((d)->d.type is 'synset'))
      .enter().append('text')
        .attr('class', 'region_label')
        .classed('leaf_synset', (d)->d.height is 2)
        .attr('dy', '0.35em')
        .text((d) -> if d.senses.length > 0 then d.senses[0].lemma else '?') # first sense is the most common
        .attr('transform', (d) ->
            bbox = this.getBBox()
            bbox_aspect = bbox.width / bbox.height
            lbbox = d.label_bbox
            lbbox_aspect = lbbox.width / lbbox.height
            rotate = bbox_aspect >= 1 and lbbox_aspect < 1 or bbox_aspect < 1 and lbbox_aspect >= 1
            if rotate
                lbbox_width = lbbox.height
                lbbox_height = lbbox.width
            else
                lbbox_width = lbbox.width
                lbbox_height = lbbox.height
                
            w_ratio = lbbox_width / bbox.width
            h_ratio = lbbox_height / bbox.height
            ratio = Math.min(w_ratio, h_ratio)*LABEL_SCALE
            
            return "translate(#{d.label_bbox.x+d.label_bbox.width/2},#{d.label_bbox.y+d.label_bbox.height/2}),scale(#{ratio}),rotate(#{if rotate then 90 else 0})"
        )
        
    ### draw the leaf labels ###
    leaf_labels_g = map.append('g')
    
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
            # regions
                # .attr('display', (d) -> if d.leaf_descendants.length*z*z*z > 5000 then 'inline' else 'none')
                # .attr('display', (d) -> if d.depth <= iz then 'inline' else 'none')
                
            regions_levels
                .attr('display', (d,i) -> if i <= iz then 'inline' else 'none')
                
            region_labels_levels
                .attr('display', (d,i) -> if i <= iz then 'inline' else 'none')
                .attr('fill-opacity', (d,i) -> if i == iz then 0.5 else 0.1)
                
            # region_labels_g.selectAll('level').filter((d,i)->i <= iz)
                # .attr('display', (d,i) -> if i <= iz then 'inline' else 'none')
                # .attr('fill-opacity', (d,i) -> if i == iz then 0.5 else 0.1)
                
            # region_labels
                # .attr('display', (d) -> if d.depth <= iz then 'inline' else 'none')
                # .attr('fill-opacity', (d) -> if d.depth == iz then 0.5 else if d.height == 2 then 0.5 else 0.1)
                
                # .attr('display', (d) -> if d.leaf_descendants.length*z*z*z > 5000 then 'inline' else 'none')
                # .attr('fill-opacity', (d) -> if d.leaf_descendants.length*z*z*z > 7000 then 0.5*7000/(d.leaf_descendants.length*z*z*z) else 0.5)
                
            if z >= LEAF_Z
                region_labels_g.attr('opacity', 0.2)
                tooltip.attr('display', 'none')
                
                leaf_labels_g.selectAll('.leaf_label')
                    .data(leaves)
                  .enter().append('text')
                    .attr('class', 'leaf_label')
                    .attr('font-size', (d) -> if d.is_core then 3.5 else 2.5)
                    .attr('dy', '0.35em')
                    .attr('transform', (d) -> "translate(#{d.x},#{d.y})")
                    .text((d) -> "#{d.lemma}")
                    .attr('font-weight', (d) -> if d.is_core then 'bold' else 'normal')
                    
            else
                region_labels_g.attr('opacity', 1)
                tooltip.attr('display', 'inline')
                
                leaf_labels_g.selectAll('.leaf_label')
                    .data([])
                  .exit().remove()
                    
            last_iz = iz
    lod_update(1)
    