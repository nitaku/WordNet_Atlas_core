### FIXME update this code to the optimized version ###

### compute a Lindenmayer system given an axiom, a number of steps and rules ###
fractalize = (config) ->
    input = config.axiom
    
    for i in [0...config.steps]
        output = ''
        
        for char in input
            if char of config.rules
                output += config.rules[char]
            else
                output += char
                
        input = output
        
    return output
    
### execute a curve string and return all the generated points ###
execute = (curve_string, angle, scale_x, scale_y, orientation) ->
    points = [{x: 0, y: 0}]
    
    for char in curve_string
        if char == '+'
            orientation += angle
        else if char == '-'
            orientation -= angle
        else if char == 'F'
            last_point = points[points.length-1]
            points.push {
                x: last_point.x + scale_x * Math.cos(orientation),
                y: last_point.y + scale_y * Math.sin(orientation)
            }
            
    return points
    
### execute a curve string and return all the generated points ###
### returns integer coordinates (works only for 0-oriented, clockwise square tilings) ###
int_execute = (curve_string) ->
    points = [{ix: 0, iy: 0}]
    dirs = [
        [+1,0],
        [0,+1],
        [-1,0],
        [0,-1]
    ]
    dir_i = 0
    
    for char in curve_string
        if char == '+'
            dir_i = (dir_i+1) % dirs.length 
        else if char == '-'
            dir_i = if dir_i is 0 then dirs.length-1 else dir_i-1 
        else if char == 'F'
            last_point = points[points.length-1]
            points.push {
                ix: last_point.ix + dirs[dir_i][0],
                iy: last_point.iy + dirs[dir_i][1]
            }
            
    return points
    
### custom base for logarithm (see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/log) ###
base_log = (x, base) -> Math.log(x) / Math.log(base)

window.sfc_layout = {
    GOSPER: {
        tiling: 'hex'
        base: 7
        angle: Math.PI/3
        axiom: 'A'
        rules:
            A: 'A+BF++BF-FA--FAFA-BF+'
            B: '-FA+BFBF++BF+FA--FA-B'
    }
    HILBERT: {
        tiling: 'square'
        base: 4
        angle: Math.PI/2
        axiom: 'A'
        rules:
            A: '-BF+AFA+FB-'
            B: '+AF-BFB-FA+'
    }
    displace: (seq, curve_cfg, scale_x, scale_y, orientation) ->
        scale_x = if scale_x? then scale_x else 10
        scale_y = if scale_y? then scale_y else 10
        orientation = if orientation? then orientation else 0
        
        ### create the minimal curve that can accommodate the whole sequence ###
        steps = Math.ceil(base_log(seq.length, curve_cfg.base))
        
        ### generate the Lindenmayer system string for the requested curve ###
        curve_string = fractalize
            steps: steps
            axiom: curve_cfg.axiom
            rules: curve_cfg.rules
            
        ### execute the string, producing the actual points of the curve ###
        curve = execute(curve_string, curve_cfg.angle, scale_x, scale_y, orientation)
        
        ### stores the coordinates in the given sequence ###
        for [d,point] in zip(seq, curve)
            d.x = point.x
            d.y = point.y
            
        ### center the layout coordinates in the center of its bounding box ###
        max_x = d3.max(seq, (d)->d.x)
        max_y = d3.max(seq, (d)->d.y)
        min_x = d3.min(seq, (d)->d.x)
        min_y = d3.min(seq, (d)->d.y)
        
        translation = {dx: -(max_x+min_x)/2, dy: -(max_y+min_y)/2}
        
        for d in seq
            d.x += translation.dx
            d.y += translation.dy
            
        ### if the curve uses a square tiling, also compute integer coordinates ###
        if curve_cfg.tiling is 'square'
            int_curve = int_execute(curve_string)
            for [d,point] in zip(seq, int_curve)
                d.ix = point.ix
                d.iy = point.iy
                
        return translation
        
    ### recursively assign positions to internal nodes too. also compute leaf descendants ###
    displace_tree: (node) ->
        if not node.children?
            ### this is a leaf ###
            node.leaf_descendants = [node]
            return node.leaf_descendants
            
        ### an internal node's position is the centroid of its leaf descendants ###
        node.leaf_descendants = (sfc_layout.displace_tree(c) for c in node.children).reduce((a, d) -> a.concat(d))
        
        node.x = d3.mean(node.leaf_descendants, (d)->d.x)
        node.y = d3.mean(node.leaf_descendants, (d)->d.y)
        
        ### pass descendants up to the hierarchy ###
        return node.leaf_descendants
}