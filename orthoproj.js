(function() {

  window.orthoproj = {
    depth_projs: function(leaves, axis, precision) {
      var a, d, depth, index, leaf, o, pile, piles, _i, _len, _ref;
      precision = precision != null ? precision : 10;
      piles = {};
      for (_i = 0, _len = leaves.length; _i < _len; _i++) {
        leaf = leaves[_i];
        /* convert the float into an integer
        */
        index = Math.round(leaf[axis] * precision);
        /* create a new pile if this index is not yet used
        */
        if (!(index in piles)) piles[index] = {};
        /* create all levels below the one of the leaf (if they don't exist already)
        */
        for (d = _ref = leaf.depth; d > 0; d += -1) {
          if (!(d in piles[index])) {
            /* store depth, leaf[axis] and a new array at each level of the pile
            */
            piles[index][d] = {
              depth: d,
              leaves: []
            };
            piles[index][d][axis] = leaf[axis];
          }
        }
        piles[index][leaf.depth].leaves.push(leaf);
      }
      /* convert the object into an array
      */
      a = [];
      for (index in piles) {
        pile = piles[index];
        for (depth in pile) {
          o = pile[depth];
          a.push(o);
        }
      }
      return a;
    }
  };

}).call(this);
