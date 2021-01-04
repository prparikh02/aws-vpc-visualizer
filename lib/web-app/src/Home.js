import React, { useState } from 'react'
import * as d3 from 'd3';
import data from './data/data.json';
import ForceGraph from './components/forceGraph';
import './App.css';

const Home = (props) => {
  const [networkData, setNetworkData] = useState(null);

  const callApi = (e) => {
    e.preventDefault();

    const baseUrl = 'https://vpc-visualizer.parthrparikh.com';
    const region = 'us-east-1';
    const roleArn = 'arn:aws:iam::156522910806:role/AwsVpcVisualizerStack-Bet-DescribeVpcResourcesBeta-37Q2T8KB5HXO';
    fetch(`${baseUrl}/beta/api/v1/security-groups?region=${region}&roleArn=${roleArn}`, {
      method: 'GET',
    })
    .then(res => res.json())
    .then(data => {
      console.log(data);
      setNetworkData(data);
    });

    const h = 300;
    const w = 700;
    const data = [12, 5, 6, 6, 9, 10];
    const svg = d3
      .select('body')
      .append('svg')
      .attr('width', w)
      .attr('height', h);
    svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d, i) => i * 70)
      .attr('y', (d, i) => h - 10 * d)
      .attr('width', 65)
      .attr('height', (d, i) => d * 10)
      .attr('fill', 'green');
  };

  return (
    <div>
      <button onClick={callApi}>
        Call API
      </button>
      <div>
        {networkData ? JSON.stringify(networkData): 'Loading...'}
      </div>
      <section>
        <ForceGraph
          links={data.links}
          nodes={data.nodes}
        />
      </section>
    </div>
  );
};

export default Home;