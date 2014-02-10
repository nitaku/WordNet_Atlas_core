(function() {
  var namegen, randlen, randsy, rsort, syllables, tcmp;

  tcmp = function(a, b) {
    var ai, bi, children_a, children_b, ci, _i, _len, _ref, _ref2;
    children_a = (a.children != null ? a.children : []);
    children_b = (b.children != null ? b.children : []);
    _ref = zip(children_a, children_b);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      _ref2 = _ref[_i], ai = _ref2[0], bi = _ref2[1];
      ci = tcmp(ai, bi);
      if (ci !== 0) return ci;
    }
    return children_b.length - children_a.length;
  };

  rsort = function(t) {
    var c, children, _i, _len;
    children = (t.children != null ? t.children : []);
    for (_i = 0, _len = children.length; _i < _len; _i++) {
      c = children[_i];
      rsort(c);
    }
    return children.sort(tcmp);
  };

  /* random name generation
  */

  syllables = ['bi', 'bo', 'bu', 'ta', 'se', 'tri', 'su', 'ke', 'ka', 'flo', 'ko', 'pi', 'pe', 'no', 'go', 'zo', 'fu', 'fo', 'si', 'pa', 'ar', 'es', 'i', 'kya', 'kyu', 'fle', 'o', 'ne', 'na', 'le', 'lu', 'ma', 'an'];

  randlen = function() {
    return 2 + Math.floor(Math.random() * 4);
  };

  randsy = function() {
    return syllables[Math.floor(Math.random() * syllables.length)];
  };

  namegen = function() {
    var j;
    return ((function() {
      var _ref, _results;
      _results = [];
      for (j = 0, _ref = randlen(); 0 <= _ref ? j < _ref : j > _ref; 0 <= _ref ? j++ : j--) {
        _results.push(randsy());
      }
      return _results;
    })()).join('');
  };

  window.tree_utils = {
    /* sort the given unordered tree using a canonical ordering
    */
    /* see Constant time generation of free trees - Wright et al. 1986
    */
    canonical_sort: function(tree) {
      return rsort(tree);
    },
    /* return the ordered sequence of leaves of a given tree
    */
    get_leaves: function(tree) {
      var parse_leaves, seq;
      seq = [];
      parse_leaves = function(node) {
        var c, _i, _len, _ref, _results;
        if (!(node.children != null)) {
          return seq.push(node);
        } else {
          _ref = node.children;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            c = _ref[_i];
            _results.push(parse_leaves(c));
          }
          return _results;
        }
      };
      parse_leaves(tree);
      return seq;
    },
    /* compute the height of each node
    */
    compute_height: function(node) {
      var c;
      if (!(node.children != null)) {
        node.height = 1;
      } else {
        node.height = d3.max((function() {
          var _i, _len, _ref, _results;
          _ref = node.children;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            c = _ref[_i];
            _results.push(tree_utils.compute_height(c));
          }
          return _results;
        })()) + 1;
      }
      return node.height;
    },
    /* compute leaf descendants
    */
    compute_leaf_descendants: function(node) {
      var c, child, _i, _len, _ref;
      if (!(node.children != null)) {
        /* this is a leaf
        */
        node.leaf_descendants = [node];
        return;
      }
      _ref = node.children;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        child = _ref[_i];
        tree_utils.compute_leaf_descendants(child);
      }
      return node.leaf_descendants = ((function() {
        var _j, _len2, _ref2, _results;
        _ref2 = node.children;
        _results = [];
        for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
          c = _ref2[_j];
          _results.push(c.leaf_descendants);
        }
        return _results;
      })()).reduce(function(a, d) {
        return a.concat(d);
      });
    },
    /* generate a random tree
    */
    random_tree: function(d, MAX_D, MAX_N) {
      /* return a tree with maximum depth MAX_D that branches with probability p at most N times for each internal node. p starts from 1 and decreases linearly with d, reaching zero at MAX_D
      */
      /* this still seems to be necessary to avoid infinte recursion (floating point precision?)
      */
      var children, i, n, p;
      if (d === MAX_D) {
        return {
          name: namegen()
        };
      }
      p = (MAX_D - d) / MAX_D;
      /* if the tree branches, at least one branch is made
      */
      n = Math.floor(Math.random() * MAX_N) + 1;
      children = [];
      for (i = 0; 0 <= n ? i < n : i > n; 0 <= n ? i++ : i--) {
        if (p >= Math.random()) {
          children.push(tree_utils.random_tree(d + 1, MAX_D, MAX_N));
        } else {
          children.push({
            name: namegen()
          });
        }
      }
      return {
        children: children,
        name: namegen()
      };
    }
  };

}).call(this);
