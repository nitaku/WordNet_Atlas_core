### python-like zip ###
window.zip = () ->
    args = [].slice.call(arguments)
    shortest = if args.length == 0 then [] else args.reduce(((a,b) ->
        if a.length < b.length then a else b
    ))
    
    return shortest.map(((_,i) ->
        args.map((array) -> array[i])
    ))