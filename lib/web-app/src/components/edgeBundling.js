import { useEffect, useRef } from 'react';
import runEdgeBundling from './edgeBundlingGenerator';
import styles from './edgeBundling.module.css';

const EdgeBundling = (props) => {
  const containerRef = useRef(null);

  useEffect(() => {
    let destroyFn;

    if (containerRef.current) {
      const { destroy } = runEdgeBundling({
        container: containerRef.current,
        links: props.links,
        nodes: props.nodes,
      });
      destroyFn = destroy;
    }

    return destroyFn;
  }, [props.links, props.nodes]);

  return (
    <div ref={containerRef} className={styles.container} />
  );
};

export default EdgeBundling;
