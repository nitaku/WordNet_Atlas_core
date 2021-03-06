
/* FIXME update this code to the optimized version
*/

/* compute a Lindenmayer system given an axiom, a number of steps and rules
*/

(function() {
  var base_log, execute, fractalize, int_execute;

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

  execute = function(curve_string, angle, scale_x, scale_y, orientation) {
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
          x: last_point.x + scale_x * Math.cos(orientation),
          y: last_point.y + scale_y * Math.sin(orientation)
        });
      }
    }
    return points;
  };

  /* execute a curve string and return all the generated points
  */

  /* returns integer coordinates (works only for 0-oriented, clockwise square tilings)
  */

  int_execute = function(curve_string) {
    var char, dir_i, dirs, last_point, points, _i, _len;
    points = [
      {
        ix: 0,
        iy: 0
      }
    ];
    dirs = [[+1, 0], [0, +1], [-1, 0], [0, -1]];
    dir_i = 0;
    for (_i = 0, _len = curve_string.length; _i < _len; _i++) {
      char = curve_string[_i];
      if (char === '+') {
        dir_i = (dir_i + 1) % dirs.length;
      } else if (char === '-') {
        dir_i = dir_i === 0 ? dirs.length - 1 : dir_i - 1;
      } else if (char === 'F') {
        last_point = points[points.length - 1];
        points.push({
          ix: last_point.ix + dirs[dir_i][0],
          iy: last_point.iy + dirs[dir_i][1]
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
      tiling: 'hex',
      base: 7,
      angle: Math.PI / 3,
      axiom: 'A',
      rules: {
        A: 'A+BF++BF-FA--FAFA-BF+',
        B: '-FA+BFBF++BF+FA--FA-B'
      }
    },
    HILBERT: {
      tiling: 'square',
      base: 4,
      angle: Math.PI / 2,
      axiom: 'A',
      rules: {
        A: '-BF+AFA+FB-',
        B: '+AF-BFB-FA+'
      }
    },
    PEANO: {
      tiling: 'square',
      base: 9,
      angle: Math.PI / 2,
      axiom: 'L',
      rules: {
        L: 'LFRFL-F-RFLFR+F+LFRFL',
        R: 'RFLFR+F+LFRFL-F-RFLFR'
      }
    },
    displace: function(seq, curve_cfg, scale_x, scale_y, orientation) {
      var curve, curve_string, d, int_curve, max_x, max_y, min_x, min_y, point, steps, translation, _i, _j, _k, _len, _len2, _len3, _ref, _ref2, _ref3, _ref4;
      scale_x = scale_x != null ? scale_x : 10;
      scale_y = scale_y != null ? scale_y : 10;
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
      curve = execute(curve_string, curve_cfg.angle, scale_x, scale_y, orientation);
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
      translation = {
        dx: -(max_x + min_x) / 2,
        dy: -(max_y + min_y) / 2
      };
      for (_j = 0, _len2 = seq.length; _j < _len2; _j++) {
        d = seq[_j];
        d.x += translation.dx;
        d.y += translation.dy;
      }
      /* if the curve uses a square tiling, also compute integer coordinates
      */
      if (curve_cfg.tiling === 'square') {
        int_curve = int_execute(curve_string);
        _ref3 = zip(seq, int_curve);
        for (_k = 0, _len3 = _ref3.length; _k < _len3; _k++) {
          _ref4 = _ref3[_k], d = _ref4[0], point = _ref4[1];
          d.ix = point.ix;
          d.iy = point.iy;
        }
      }
      return translation;
    },
    /* recursively assign positions to internal nodes too
    */
    displace_tree: function(node) {
      var child, _i, _len, _ref, _results;
      if (!(node.children != null)) {
        /* this is a leaf
        */
        return;
      }
      /* an internal node's position is the centroid of its leaf descendants
      */
      node.x = d3.mean(node.leaf_descendants, function(d) {
        return d.x;
      });
      node.y = d3.mean(node.leaf_descendants, function(d) {
        return d.y;
      });
      _ref = node.children;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        child = _ref[_i];
        _results.push(sfc_layout.displace_tree(child));
      }
      return _results;
    }
  };

}).call(this);
