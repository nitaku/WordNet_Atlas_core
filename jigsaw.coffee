window.jigsaw = {
    hex_generate_svg_path: (scale) ->
        a = scale/2
        r = a / Math.sin(Math.PI/3)
        return "M#{r} 0 L#{r/2} #{a} L#{-r/2} #{a} L#{-r} 0 L#{-r/2} #{-a} L#{r/2} #{-a} Z"
        
    square_generate_svg_path: (scale) ->
        a = scale/2
        return "M#{-a} #{-a} L#{-a} #{a} L#{a} #{a} L#{a} #{-a} Z"
        
    iso_generate_svg_path: (scale) ->
        rx = scale*Math.sqrt(2)/2
        ry = scale*Math.sqrt(2)/(2*Math.sqrt(3))
        return "M#{0} #{-ry} L#{rx} #{0} L#{0} #{ry} L#{-rx} #{0} Z"
        
    HEX_CELL: (node, scale) ->
        a = scale/2
        r = a / Math.sin(Math.PI/3)
        region = [[{X:node.x+r, Y:node.y}, {X:node.x+r/2, Y:node.y+a}, {X:node.x-r/2, Y:node.y+a}, {X:node.x-r, Y:node.y}, {X:node.x-r/2, Y:node.y-a}, {X:node.x+r/2, Y:node.y-a}]]
        
        return region
        
    SQUARE_CELL: (node, scale) ->
        a = scale/2
        region = [[{X:node.x-a, Y:node.y-a}, {X:node.x-a, Y:node.y+a}, {X:node.x+a, Y:node.y+a}, {X:node.x+a, Y:node.y-a}]]
        
        return region
        
    ISO_CELL: (node, scale) ->
        rx = scale*Math.sqrt(2)/2
        ry = scale*Math.sqrt(2)/(2*Math.sqrt(3))
        region = [[{X:node.x, Y:node.y-ry}, {X:node.x+rx, Y:node.y}, {X:node.x, Y:node.y+ry}, {X:node.x-rx, Y:node.y}]]
        
    treemap: (node, scale, base) ->
        if not node.children?
            node.region = base(node, scale)
            return node.region
            
        children_paths = (jigsaw.treemap(child, scale, base) for child in node.children).reduce((a, d) -> a.concat(d))
        
        upscale = 1000
        ClipperLib.JS.ScaleUpPaths(children_paths, upscale)
        
        cpr = new ClipperLib.Clipper()
        cpr.AddPaths(children_paths, ClipperLib.PolyType.ptSubject, true)
        
        node.region = new ClipperLib.Paths()
        
        cpr.Execute(ClipperLib.ClipType.ctUnion, node.region, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
        
        ClipperLib.JS.ScaleDownPaths(children_paths, upscale)
        ClipperLib.JS.ScaleDownPaths(node.region, upscale)
        
        return node.region
    
    ### Converts Paths to SVG path string ###
    ### and scales down the coordinates ###
    ### from http://jsclipper.sourceforge.net/6.1.3.1/index.html?p=starter_boolean.html ###
    get_svg_path: (paths, scale) ->
        svgpath = ''

        if not scale?
            scale = 1
            
        for path in paths
            for p, i in path
                if i is 0
                    svgpath += 'M'
                else
                    svgpath += 'L'
                svgpath += p.X/scale + ", " + p.Y/scale
                
            svgpath += 'Z'
            
        if svgpath is ''
            svgpath = 'M0,0'
            
        return svgpath
        
}