import { useCallback, useEffect, useRef } from 'react';
import runForceGraph from './forceGraphGenerator';
import styles from './forceGraph.module.css';

const ForceGraph = (props) => {
  const containerRef = useRef(null);

  const nodeHoverTooltip = useCallback((node) => {
    return `<div>${node.name}</div>`;
  }, []);

  useEffect(() => {
    let destroyFn;

    if (containerRef.current) {
      const { destroy } = runForceGraph({
        container: containerRef.current,
        links: props.links,
        nodes: props.nodes,
        nodeHoverTooltip: nodeHoverTooltip,
      });
      destroyFn = destroy;
    }

    return destroyFn;
  }, [props.links, props.nodes, nodeHoverTooltip]);

  return (
    <div ref={containerRef} className={styles.container} />
  );
};

export default ForceGraph;

// Credit: https://levelup.gitconnected.com/creating-a-force-graph-using-react-and-d3-6579bcd9628c
