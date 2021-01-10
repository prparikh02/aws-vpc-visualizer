import * as d3 from 'd3';
import styles from './forceGraph.module.css';

const runForceGraph = (props) => {
  const links = props.links.map((d) => Object.assign({}, d));
  const nodes = props.nodes.map((d) => Object.assign({}, d));

  const containerRect = props.container.getBoundingClientRect();
  const height = containerRect.height;
  const width = containerRect.width;

  const color = (d) => {
    switch (d.type) {
      case 'SECURITY_GROUP':
        return '#FF0000';
      case 'CIDR_IP':
      case 'CIDR_IPV6':
        return '#0000FF';
      case 'PREFIX_LIST':
        return '#00FF00'
      default:
        return '#000000';
    }
  };

  const icon = (d) => {
    switch (d.type) {
      case 'SECURITY_GROUP':
        return 'SG';
      case 'CIDR_IP':
        return 'CIP';
      case 'CIDR_IPV6':
        return 'CIPV6';
      case 'PREFIX_LIST':
        return 'PL'
      default:
        return 'UNK';
    }
  }

  const getClass = (d) => {
    switch (d.type) {
      case 'SECURITY_GROUP':
        return styles.nodeSecurityGroup;
      case 'CIDR_IP':
      case 'CIDR_IPV6':
        return styles.nodeCidrIp;
      case 'PREFIX_LIST':
        return styles.nodePrefixList;
      default:
        return styles.nodeUnknown;
    }
  };

  // Define drag behaviour
  const drag = (simulation) => {
    const dragStarted = (event, d) => {
      if (!event.active) {
        simulation.alphaTarget(0.3).restart();
      }
      d.fx = d.x;
      d.fy = d.y;
    };

    const dragging = (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    };

    const dragEnded = (event, d) => {
      if (!event.active) {
        simulation.alphaTarget(0);
      }
      d.fx = null;
      d.fy = null;
    };

    return d3
      .drag()
      .on('start', dragStarted)
      .on('drag', dragging)
      .on('end', dragEnded);
  };

  // Add the tooltip element to the graph
  const tooltip = document.querySelector('#graph-tooltip');
  if (!tooltip) {
    const tooltipDiv = document.createElement('div');
    tooltipDiv.classList.add(styles.tooltip);
    tooltipDiv.style.opacity = '0';
    tooltipDiv.id = 'graph-tooltip';
    document.body.appendChild(tooltipDiv);
  }
  const tooltipDiv = d3.select('#graph-tooltip');
  const addTooltip = (hoverTooltip, d, x, y) => {
    tooltipDiv
      .transition()
      .duration(200)
      .style('opacity', 0.9);
    tooltipDiv
      .html(hoverTooltip(d))
      .style('left', `${x}px`)
      .style('top', `${y - 28}px`);
  };
  const removeTooltip = () => {
    tooltipDiv
      .transition()
      .duration(200)
      .style('opacity', 0);
  };

  const simulation = d3
    .forceSimulation(nodes)
    .force('link', d3.forceLink(links)
      .id(d => d.id)
      .distance(50))
    .force('charge', d3.forceManyBody().strength(-150))
    .force('x', d3.forceX())
    .force('y', d3.forceY());

  const svg = d3
    .select(props.container)
    .append('svg')
    .attr('viewBox', [-width / 2, -height / 2, width, height])
    .call(d3.zoom()
      // .scaleExtent([1, 2])
      // .on('zoom', function (event) {
      //   svg.attr('transform', event.transform);
      // })
    );
  svg.append('defs').append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '-0 -5 10 10')
    .attr('refX', 20)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 13)
    .attr('markerHeight', 13)
    .attr('xoverflow', 'visible')
    .append('svg:path')
    .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
    .attr('fill', '#999')
    .style('stroke','none');

  const link = svg
    .append('g')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.8)
    .selectAll('line')
    .data(links)
    .join('line')
    // .attr('stroke-width', d => Math.sqrt(d.value))
    .attr('marker-end','url(#arrowhead)');

  const node = svg
    .append('g')
    .attr('stroke', '#fff')
    .attr('stroke-width', 1)
    .selectAll('circle')
    .data(nodes)
    .join('circle')
    .attr('r', 14)  // TODO: This is where we can play with the size
    .attr('fill', d => color(d))
    .call(drag(simulation));

  const label = svg
    .append('g')
    .attr('class', 'labels')
    .selectAll('text')
    .data(nodes)
    .enter()
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('class', d => `fa ${getClass(d)}`)
    .text(d => {return icon(d);})
    .call(drag(simulation));

  label
    .on('mouseover', (event, d) => {
      addTooltip(props.nodeHoverTooltip, d, event.pageX, event.pageY);
    })
    .on('mouseout', () => {
      removeTooltip();
    });

  simulation.on('tick', () => {
    const isSelfLoop = (d) => {
      return (
        d.source.x === d.target.x &&
        d.source.y === d.target.y
      );
    };
    const radius = (d) => {
      const dx = d.target.x - d.source.x;
      const dy = d.target.y - d.source.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    //update link positions
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      // Fudge the target parameters just a
      // little so the loop does not collapse.
      .attr('x2', d => isSelfLoop(d) ? d.target.x + 1 : d.target.x)
      .attr('y2', d => isSelfLoop(d) ? d.target.y + 1 : d.target.y)
      // drx != dry to create an ellipse
      .attr('drx', d => isSelfLoop(d) ? 30 : radius(d))
      .attr('dry', d => isSelfLoop(d) ? 20 : radius(d))
      // Fiddle with rotation
      .attr('xRotation', d => isSelfLoop(d) ? -45 : 0)
      // Needs to be 1
      .attr('largeArc', d => isSelfLoop(d) ? 1 : 0);

    // The above isn't working :(
    // And neither is the below.
    // link.attr('d', d => (
    //   'M' + d.source.x +
    //   ',' + d.source.y +
    //   'A' + (isSelfLoop(d) ? 30 : radius(d)) +
    //   ',' + (isSelfLoop(d) ? 20 : radius(d)) +
    //   ' ' + (isSelfLoop(d) ? -45 : 0) +
    //   ',' + (isSelfLoop(d) ? 1 : 0) +
    //   ',' + 1 +
    //   ' ' + (isSelfLoop(d) ? d.target.x + 1 : d.target.x) +
    //   ',' + (isSelfLoop(d) ? d.target.y + 1 : d.target.y)
    // ));

    // update node positions
    node
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    // update label positions
    label
      .attr('x', d => { return d.x; })
      .attr('y', d => { return d.y; })
  });

  return {
    destroy: () => {
      simulation.stop();
    },
    nodes: () => {
      return svg.node();
    },
  };
};

export default runForceGraph;

// Credit: https://levelup.gitconnected.com/creating-a-force-graph-using-react-and-d3-6579bcd9628c
