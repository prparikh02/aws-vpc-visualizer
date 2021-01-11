/*
  Credit: https://blog.rowanudell.com/visualising-ec2-security-groups/
*/

import * as d3 from 'd3';
import styles from './edgeBundling.module.css';

const runEdgeBundling = (props) => {
  const relationships = props.links.map((d) => Object.assign({}, d));
  // const entities = props.nodes.map((d) => Object.assign({}, d));
  
  const buildAdjacency = (edges) => {
    const adjList = {};
    edges.forEach((edge) => {
      [edge.source, edge.target].forEach((id) => {
        if (!adjList[id]) {
          adjList[id] = {
            name: id,
            egress: new Set(),
          }
        }
      });
      adjList[edge.source].egress.add(edge.target);
    });
    return Object.values(adjList);
  };

  const adjacency = buildAdjacency(relationships);

  // TODO: Maybe do something with this to be dynamic (e.g. diameter)? Idk.
  const containerRect = props.container.getBoundingClientRect();
  const height = containerRect.height;
  const width = containerRect.width;

  const diameter = Math.min(height, width);
  // const diameter = 800;  // TODO: (B)
  const radius = diameter / 2;
  const radiusDelta = 100;
  const innerRadius = radius - radiusDelta;

  const cluster = d3.cluster()
    .size([360, innerRadius])

  const line = d3.lineRadial()
    .radius((d) => d.y)
    .angle((d) => d.x / 180 * Math.PI)
    .curve(d3.curveBundle.beta(0.85));

  const svg = d3
    .select(props.container)
    .append('svg')
    .attr('width', diameter)
    .attr('height', diameter)
    .append('g')
    .attr('transform', 'translate(' + radius + ',' + radius + ')');

  var link = svg
    .append('g')
    .selectAll('.link');
  var node = svg
    .append('g')
    .selectAll('.node');

  const nodeMouseover = (event, d) => {
    node.each((n) => n.target = n.source = false);

    link
      .classed(styles.linkTarget, (l) => {
        if (l.target === d) {
          return l.source.source = true;
        }
      })
      .classed(styles.linkSource, (l) => {
        if (l.source === d) {
          return l.target.target = true;
        }
      });

    node
      .classed(styles.nodeTarget, (n) => n.target)
      .classed(styles.nodeSource, (n) => n.source);
  };

  const nodeMouseout = (d) => {
    link
      .classed(styles.linkTarget, false)
      .classed(styles.linkSource, false);

    node
      .classed(styles.nodeTarget, false)
      .classed(styles.nodeSource, false);
  };

  const groupHierarchy = (groups) => {
    const map = {};
    const root = {name: '', children: []};

    const find = (name, data) => {
      if (map[name]) {
        return map[name];
      }
      map[name] = data || {name: name, children: []};
      const node = map[name];
      node.parent = root;
      node.parent.children.push(node);
    };

    groups.forEach((d) => find(d.name, d));
    groups.forEach((d) => {
      d.egress.forEach((n) => find(n.name));
    });

    return root;
  };

  const makeLinks = (nodes) => {
    const map = {};
    const links = [];

    nodes.forEach((n) => {
      map[n.data.name] = n;
    });

    nodes.forEach((n) => {
      if (n.data.egress) {
        n.data.egress.forEach((m) => {
          if (map[m]) {
            links.push({source: map[n.data.name], target: map[m]});
          }
        });
      }
    });

    return links;
  };

  const root = d3.hierarchy(groupHierarchy(adjacency), (d) => d.children);
  const links = makeLinks(root.descendants());
  cluster(root);
  const nodes = root.descendants();

  link = link.data(links)
    .enter()
    .append('path')
    .attr('class', styles.link)
    .attr('d', d => line(d.source.path(d.target)));

  node = svg
    .selectAll('g.node')
    .data(nodes.filter((n) => !n.children))
    .enter()
    .append('g')
    .attr('class', styles.node)
    .attr('transform', (d) => `rotate(${d.x - 90})translate(${d.y})`)
    .attr('transform', (d) => {
      return 'rotate(' + (d.x - 90) + ')translate(' + (d.y + 8) + ',0)'
        + (d.x < 180 ? '' : 'rotate(180)');
    })
    .append('text')
    .style('text-anchor', (d) => d.x < 180 ? 'start' : 'end')
    .text((d) => d.data.name)
    .on('mouseover', nodeMouseover)
    .on('mouseout', nodeMouseout);
  
  return {
    destroy: () => {
      console.log('Destroy!');
    },
    tree: () => {
      return svg.node();
    },
  };
};

export default runEdgeBundling;
