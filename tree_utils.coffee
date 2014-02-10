tcmp = (a,b) ->
    children_a = (if a.children? then a.children else [])
    children_b = (if b.children? then b.children else [])
    for [ai, bi] in zip(children_a,children_b)
        ci = tcmp(ai,bi)
        if ci isnt 0
            return ci
    return children_b.length-children_a.length
    
rsort = (t) ->
    children = (if t.children? then t.children else [])
    for c in children
        rsort(c)
        
    children.sort(tcmp)
    
### random name generation ###
syllables = ['bi','bo','bu','ta','se','tri','su','ke','ka','flo','ko','pi','pe','no','go','zo','fu','fo','si','pa','ar','es','i','kya','kyu','fle','o','ne','na','le','lu','ma','an']

randlen = () -> 2+Math.floor(Math.random()*4)
randsy = () -> syllables[Math.floor(Math.random()*syllables.length)]

namegen = () -> (randsy() for j in [0...randlen()]).join('')

window.tree_utils = {
    ### sort the given unordered tree using a canonical ordering ###
    ### see Constant time generation of free trees - Wright et al. 1986 ###
    canonical_sort: (tree) ->
        rsort(tree)
        
    ### return the ordered sequence of leaves of a given tree ###
    get_leaves: (tree) ->
        seq = []
        parse_leaves = (node) ->
            if not node.children?
                seq.push node
            else
                for c in node.children
                    parse_leaves(c)
                    
        parse_leaves(tree)
        
        return seq
        
    ### compute the height of each node ###
    compute_height: (node) ->
        if not node.children?
            node.height = 1
        else
            node.height = d3.max((tree_utils.compute_height(c) for c in node.children)) + 1
            
        return node.height
        
    ### compute leaf descendants ###
    compute_leaf_descendants: (node) ->
        if not node.children?
            ### this is a leaf ###
            node.leaf_descendants = [node]
            return
            
        for child in node.children
            tree_utils.compute_leaf_descendants(child)
            
        node.leaf_descendants = (c.leaf_descendants for c in node.children).reduce((a, d) -> a.concat(d))
        
    ### generate a random tree ###
    random_tree: (d, MAX_D, MAX_N) ->
        ### return a tree with maximum depth MAX_D that branches with probability p at most N times for each internal node. p starts from 1 and decreases linearly with d, reaching zero at MAX_D ###
        
        ### this still seems to be necessary to avoid infinte recursion (floating point precision?) ###
        return {name: namegen()} if d is MAX_D
        
        p = (MAX_D-d)/MAX_D
        
        ### if the tree branches, at least one branch is made ###
        n = Math.floor(Math.random()*MAX_N)+1
        
        children = []
        
        for i in [0...n]
            if p >= Math.random()
                children.push tree_utils.random_tree(d+1, MAX_D, MAX_N)
            else
                children.push {name: namegen()}
                
        return {
            children: children,
            name: namegen()
        }
}