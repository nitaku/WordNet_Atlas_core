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
            
        jigsaw.treemap(child, scale, base) for child in node.children
        children_paths = node.children.map((d)->d.region).reduce((a, d) -> a.concat(d))
        
        upscale = 1000
        ClipperLib.JS.ScaleUpPaths(children_paths, upscale)
        
        cpr = new ClipperLib.Clipper()
        cpr.AddPaths(children_paths, ClipperLib.PolyType.ptSubject, true)
        
        node.region = new ClipperLib.Paths()
        
        cpr.Execute(ClipperLib.ClipType.ctUnion, node.region, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
        
        ClipperLib.JS.ScaleDownPaths(children_paths, upscale)
        ClipperLib.JS.ScaleDownPaths(node.region, upscale)
    
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
        
    hilbert_labels: (node, scale) ->
        ### create a sort of bitmap of this node's cells ###
        matrix = {}
        
        for cell in node.leaf_descendants
            if cell.ix not of matrix
                matrix[cell.ix] = {}
                
            matrix[cell.ix][cell.iy] = cell
            
        ### compute the matrix boundaries ###
        min_ix = d3.min(node.leaf_descendants, (d)->d.ix)
        max_ix = d3.max(node.leaf_descendants, (d)->d.ix)
        min_iy = d3.min(node.leaf_descendants, (d)->d.iy)
        max_iy = d3.max(node.leaf_descendants, (d)->d.iy)
        
        ### scan X to create tall boxes ###
        x_boxes = []
        for ix in [min_ix..max_ix]
            x_boxes.push {}
            for iy in [min_iy..max_iy]
                last_box = x_boxes[x_boxes.length-1]
                if ix of matrix and iy of matrix[ix]
                    if 'topleft' not of last_box
                        last_box.bottomright = last_box.topleft = matrix[ix][iy]
                        last_box.area = 1
                    else
                        last_box.bottomright = matrix[ix][iy]
                        last_box.area += 1
                else if 'topleft' of last_box # this checks if last_box is not empty
                    x_boxes.push {}
                    
        ### scan Y to create wide boxes ###
        y_boxes = []
        for iy in [min_iy..max_iy]
            y_boxes.push {}
            for ix in [min_ix..max_ix]
                last_box = y_boxes[y_boxes.length-1]
                if ix of matrix and iy of matrix[ix]
                    if 'topleft' not of last_box
                        last_box.topleft = matrix[ix][iy]
                        last_box.bottomright = matrix[ix][iy]
                        last_box.area = 1
                    else
                        last_box.bottomright = matrix[ix][iy]
                        last_box.area += 1
                else if 'topleft' of last_box # this checks if last_box is not empty
                    y_boxes.push {}
                    
        ### grow boxes along X ###
        for box in x_boxes
            if not box.topleft? # FIXME there are some holes into the structure
                continue
                
            grow = true
            original_area = box.area
            while grow
                ixg = box.bottomright.ix+1
                for iyg in [box.topleft.iy..box.bottomright.iy]
                    grow = ixg of matrix and iyg of matrix[ixg]
                    if not grow
                        break
                        
                if grow
                    box.bottomright = matrix[ixg][box.bottomright.iy]
                    box.area += original_area
                    
        ### grow boxes along Y ###
        for box in y_boxes
            if not box.topleft? # FIXME there are some holes into the structure
                continue
                
            grow = true
            original_area = box.area
            while grow
                iyg = box.bottomright.iy+1
                for ixg in [box.topleft.ix..box.bottomright.ix]
                    grow = ixg of matrix and iyg of matrix[ixg]
                    if not grow
                        break
                        
                if grow
                    box.bottomright = matrix[box.bottomright.ix][iyg]
                    box.area += original_area
                    
        ### select the biggest box ###
        boxes = x_boxes.concat(y_boxes)
        max_area = d3.max(boxes,(b)->b.area)
        box = boxes.filter((d)->d.area == max_area)[0]
        
        ### convert into x,y coordinates ###
        min_x = box.topleft.ix*scale-scale/2
        max_x = box.bottomright.ix*scale+scale/2
        min_y = box.topleft.iy*scale-scale/2
        max_y = box.bottomright.iy*scale+scale/2
        
        node.label_bbox = {
            x: min_x,
            y: min_y,
            width: max_x-min_x,
            height: max_y-min_y
        }
        
        if node.children?
            for child in node.children
                jigsaw.hilbert_labels(child, scale)
}