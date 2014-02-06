
/* FIXME update this code to the optimized version
*/

/* compute a Lindenmayer system given an axiom, a number of steps and rules
*/

(function() {
  var base_log, execute, fractalize;

  fractalize = function(config) {
    var char, i, input, output, _i, _len, _ref;
    input = config.axiom;
    for (i = 0, _ref = config.steps; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
      output = '';
      for (_i = 0, _len = input.length; _i < _len; _i++) {
        char = input[_i];
        if (char in config.rules) {
          output += config.rules[char];
        } else {
          output += char;
        }
      }
      input = output;
    }
    return output;
  };

  /* execute a curve string and return all the generated points
  */

  execute = function(curve_string, angle, scale, orientation) {
    var char, last_point, points, _i, _len;
    points = [
      {
        x: 0,
        y: 0
      }
    ];
    for (_i = 0, _len = curve_string.length; _i < _len; _i++) {
      char = curve_string[_i];
      if (char === '+') {
        orientation += angle;
      } else if (char === '-') {
        orientation -= angle;
      } else if (char === 'F') {
        last_point = points[points.length - 1];
        points.push({
          x: last_point.x + scale * Math.cos(orientation),
          y: last_point.y + scale * Math.sin(orientation)
        });
      }
    }
    return points;
  };

  /* custom base for logarithm (see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/log)
  */

  base_log = function(x, base) {
    return Math.log(x) / Math.log(base);
  };

  window.sfc_layout = {
    GOSPER: {
      base: 7,
      angle: Math.PI / 3,
      axiom: 'A',
      rules: {
        A: 'A+BF++BF-FA--FAFA-BF+',
        B: '-FA+BFBF++BF+FA--FA-B'
      }
    },
    HILBERT: {
      base: 4,
      angle: Math.PI / 2,
      axiom: 'A',
      rules: {
        A: '-BF+AFA+FB-',
        B: '+AF-BFB-FA+'
      }
    },
    displace: function(seq, curve_cfg, scale, orientation) {
      var curve, curve_string, d, max_x, max_y, min_x, min_y, point, steps, _i, _j, _len, _len2, _ref, _ref2, _results;
      scale = scale != null ? scale : 10;
      orientation = orientation != null ? orientation : 0;
      /* create the minimal curve that can accommodate the whole sequence
      */
      steps = Math.ceil(base_log(seq.length, curve_cfg.base));
      /* generate the Lindenmayer system string for the requested curve
      */
      curve_string = fractalize({
        steps: steps,
        axiom: curve_cfg.axiom,
        rules: curve_cfg.rules
      });
      /* execute the string, producing the actual points of the curve
      */
      curve = execute(curve_string, curve_cfg.angle, scale, orientation);
      /* stores the coordinates in the given sequence
      */
      _ref = zip(seq, curve);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        _ref2 = _ref[_i], d = _ref2[0], point = _ref2[1];
        d.x = point.x;
        d.y = point.y;
      }
      /* center the layout coordinates in the center of its bounding box
      */
      max_x = d3.max(seq, function(d) {
        return d.x;
      });
      max_y = d3.max(seq, function(d) {
        return d.y;
      });
      min_x = d3.min(seq, function(d) {
        return d.x;
      });
      min_y = d3.min(seq, function(d) {
        return d.y;
      });
      _results = [];
      for (_j = 0, _len2 = seq.length; _j < _len2; _j++) {
        d = seq[_j];
        d.x -= (max_x + min_x) / 2;
        _results.push(d.y -= (max_y + min_y) / 2);
      }
      return _results;
    },
    /* recursively assign positions to internal nodes too. also compute leaf descendants
    */
    displace_tree: function(node) {
      var c;
      if (!(node.children != null)) {
        /* this is a leaf
        */
        node.leaf_descendants = [node];
        return node.leaf_descendants;
      }
      /* an internal node's position is the centroid of its leaf descendants
      */
      node.leaf_descendants = ((function() {
        var _i, _len, _ref, _results;
        _ref = node.children;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          c = _ref[_i];
          _results.push(sfc_layout.displace_tree(c));
        }
        return _results;
      })()).reduce(function(a, d) {
        return a.concat(d);
      });
      node.x = d3.mean(node.leaf_descendants, function(d) {
        return d.x;
      });
      node.y = d3.mean(node.leaf_descendants, function(d) {
        return d.y;
      });
      /* pass descendants up to the hierarchy
      */
      return node.leaf_descendants;
    }
  };

}).call(this);
