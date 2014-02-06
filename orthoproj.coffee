window.orthoproj = {
    depth_projs: (leaves, axis, precision) ->
        precision = if precision? then precision else 10
        
        piles = {}
        
        for leaf in leaves
            ### convert the float into an integer ###
            index = Math.round(leaf[axis]*precision)
            
            ### create a new pile if this index is not yet used ###
            if index not of piles
                piles[index] = {}
                
            ### create all levels below the one of the leaf (if they don't exist already) ###
            for d in [leaf.depth...0] by -1
                if d not of piles[index]
                    ### store depth, leaf[axis] and a new array at each level of the pile ###
                    piles[index][d] = {
                        depth: d,
                        leaves: []
                    }
                    piles[index][d][axis] = leaf[axis]
                    
            piles[index][leaf.depth].leaves.push leaf
            
        ### convert the object into an array ###
        a = []
        for index, pile of piles
            for depth, o of pile
                a.push o
                
        return a
}