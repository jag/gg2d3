var bubble, categories, country, create, createBubble, createMap, data, i, map, start, update, updateBubble, updateMap;

data = {};

i = 0;

d3.json("./data/working_data.json", function(d) {
  data.working = d;
  i++;
  if (i === 2) return start();
});

d3.json("./data/world_countries.json", function(d) {
  data.countries = d;
  i++;
  if (i === 2) return start();
});

map = null;

bubble = null;

categories = ["Web Development", "Software Development", "Networking & Information Systems", "Writing & Translation", "Administrative Support", "Design & Multimedia", "Customer Service", "Sales & Marketing", "Business Services"];

country = "United States";

start = function() {
  create();
  return update();
};

create = function() {
  createMap();
  return createBubble();
};

createMap = function() {
  var feature, fishPolygon, i, refish, size, _i, _len, _ref, _results;
  size = $("#map").parent().parent().width();
  map = d3.select("#map").append("svg").attr("height", size).attr("width", size);
  map.projection = d3.geo.mercator().scale(size).translate([size / 2, size / 2]);
  map.path = d3.geo.path().projection(map.projection);
  map.fisheye = d3.fisheye().radius(50).power(10);
  feature = map.selectAll("path").data(data.countries.features).enter().append("path").attr("class", function(d) {
    if (d.properties.name in data.working) {
      if (d.properties.name === country) {
        return 'selected';
      } else {
        return 'unselected';
      }
    } else {
      return 'feature';
    }
  }).attr("d", function(d) {
    return map.path(d);
  }).each(function(d) {
    return d.org = d.geometry.coordinates;
  }).on('click', function(d, i) {
    var clicked;
    clicked = d.properties.name;
    if (!(clicked in data.working)) return;
    country = clicked;
    return update();
  });
  feature.each(function(d, i) {
    return $(this).tooltip({
      title: d.properties.name
    });
  });
  fishPolygon = function(polygon) {
    return _.map(polygon, function(list) {
      return _.map(list, function(tuple) {
        var c, p;
        p = map.projection(tuple);
        c = map.fisheye({
          x: p[0],
          y: p[1]
        });
        return map.projection.invert([c.x, c.y]);
      });
    });
  };
  refish = function(e) {
    var x, y;
    x = e.offsetX;
    y = e.offsetY;
    if (x == null) x = e.screenX - map.offset().left;
    if (y == null) y = e.screenY - map.offset().top;
    map.fisheye.center([x, y]);
    return map.selectAll("path").attr("d", function(d) {
      var clone, processed, type;
      clone = $.extend({}, d);
      type = clone.geometry.type;
      processed = type === "Polygon" ? fishPolygon(d.org) : _.map(d.org, fishPolygon);
      clone.geometry.coordinates = processed;
      return map.path(clone);
    });
  };
  _ref = ["mousemove", "mousein", "mouseout", "touch", "touchmove"];
  _results = [];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    i = _ref[_i];
    _results.push($("#map").on(i, refish));
  }
  return _results;
};

createBubble = function() {
  var box, c, size, t, _i, _len, _results;
  size = Math.min($("#bubble").width(), $(document).height());
  bubble = d3.selectAll("#bubble").append("svg").attr("width", size).attr("height", size).attr("class", "pack").append("g").attr("transform", "translate(0,0)");
  bubble.size = size;
  bubble.colors = d3.scale.category20().domain(categories);
  bubble.flatten = function(root) {
    var classes, recurse;
    classes = [];
    recurse = function(name, node) {
      if (node.children) {
        return node.children.forEach(function(child) {
          return recurse(node.name, child);
        });
      } else {
        return classes.push({
          packageName: name,
          className: node.name,
          value: node.size
        });
      }
    };
    recurse(null, root);
    return {
      children: classes,
      className: "Total"
    };
  };
  _results = [];
  for (_i = 0, _len = categories.length; _i < _len; _i++) {
    t = categories[_i];
    c = $("<div>");
    box = $("<div>").css({
      height: 10,
      width: 10,
      "background-color": bubble.colors(t)
    });
    _results.push($("#cats").append(box, $("<p>").text(t)));
  }
  return _results;
};

update = function() {
  updateMap();
  return updateBubble();
};

updateMap = function() {
  var feature;
  return feature = map.selectAll("path").attr("class", function(d) {
    if (d.properties.name in data.working) {
      if (d.properties.name === country) {
        return 'selected';
      } else {
        return 'unselected';
      }
    } else {
      return 'feature';
    }
  });
};

updateBubble = function() {
  var big_name, big_ob, children, d, f, format, g, grandchildren, node, packer, small_name, small_size, sum, sums, timing;
  d = data.working[country].job_types;
  f = {
    name: "jobs"
  };
  children = [];
  sums = {};
  for (big_name in d) {
    big_ob = d[big_name];
    grandchildren = [];
    sum = 0;
    for (small_name in big_ob) {
      small_size = big_ob[small_name];
      grandchildren.push({
        "name": small_name,
        "size": small_size
      });
      sum += small_size;
    }
    children.push({
      "name": big_name,
      "children": grandchildren.sort(function(a, b) {
        return a.size < b.size;
      })
    });
    sums[big_name] = sum;
  }
  f.children = children.sort(function(a, b) {
    return sums[a.name] < sums[b.name];
  });
  format = d3.format(",d");
  packer = d3.layout.pack().sort(null).size([bubble.size, bubble.size]).value(function(d) {
    return d.value;
  });
  timing = 100;
  node = bubble.selectAll("g.node").data(packer.nodes(bubble.flatten(f)), function(d) {
    return d.className;
  });
  g = node.enter().append("g").attr("transform", function(d) {
    return "translate(" + d.x + "," + d.y + ")";
  });
  g.append("circle");
  g.each(function(d, i) {
    return $(this).tooltip({
      title: "" + d.className + " <br /> " + d.value + " projects completed",
      placement: "top"
    });
  });
  g.filter(function(d) {
    return !d.children;
  }).append("text");
  node.transition().delay(timing).attr("class", function(d) {
    if (d.children != null) {
      return "node";
    } else {
      return "leaf node";
    }
  }).attr("transform", function(d) {
    return "translate(" + d.x + "," + d.y + ")";
  });
  node.select("circle").transition().delay(timing).attr("r", function(d) {
    return d.r;
  }).attr("fill", function(d) {
    if (d.packageName) {
      return bubble.colors(d.packageName);
    } else {
      return "none";
    }
  });
  node.filter(function(d) {
    return !d.children;
  }).select("text").transition().delay(timing).attr("text-anchor", "middle").attr("dy", ".3em").text(function(d) {
    return d.className.substring(0, d.r / 4);
  });
  return node.exit().remove();
};
