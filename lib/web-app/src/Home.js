import React, { useState } from 'react'
import EdgeBundling from './components/edgeBundling';
import ForceGraph from './components/forceGraph';
import './App.css';
import { json } from 'd3';

const Home = (props) => {
  const [networkData, setNetworkData] = useState(null);
  const [apiButtonDisabled, setApiButtonDisabled] = useState(false);
  const [visualizationType, setVisualizationType] = useState('forceDirected');
  const [region, setRegion] = useState('us-east-1');
  const [roleArn, setRoleArn] = useState('');

  const callApi = (e) => {
    e.preventDefault();

    const baseUrl = 'https://vpc-visualizer.parthrparikh.com';
    // const roleArn = 'arn:aws:iam::156522910806:role/AwsVpcVisualizerStack-Bet-DescribeVpcResourcesBeta-37Q2T8KB5HXO';
    fetch(`${baseUrl}/beta/api/v1/security-groups?region=${region}&roleArn=${roleArn}`, {
      // method: 'POST',
      method: 'GET',
      // headers: {
      //   'Content-Type': 'application/json'
      // },
      // body: JSON.stringify({
      //   region: region,
      //   roleArn: roleArn,
      // }),
    })
    .then(res => res.json())
    .then(data => {
      setNetworkData(data);
    });

    setApiButtonDisabled(true);
  };

  const handleVisualizationTypeChange = (event) => {
    setVisualizationType(event.target.value);
  }

  const handleRegionChange = (event) => {
    setRegion(event.target.value);
  };

  const handleRoleArnChange = (event) => {
    setRoleArn(event.target.value);
  };

  return (
    <div>
      <form onSubmit={callApi}>
        <input disabled={apiButtonDisabled} type='submit' value='Render' />
        <select value={region} onChange={handleRegionChange}>
          <option value='us-east-1'>us-east-1</option>
          <option value='eu-west-1'>eu-west-1</option>
          <option value='us-west-2'>us-west-2</option>
        </select>
        <label>
          Name:
          <input type='text' value={roleArn} onChange={handleRoleArnChange} />
        </label>
        <select value={visualizationType} onChange={handleVisualizationTypeChange}>
          <option value='forceDirected'>Force Directed</option>
          <option value='edgeBundling'>Edge Bundling</option>
        </select>
      </form>
      <section>
        {networkData
          ? visualizationType === 'forceDirected'
            ? <ForceGraph
                nodes={Object.values(networkData.nodes)}
                links={networkData.edges}
              />
            : <EdgeBundling
                nodes={Object.values(networkData.nodes)}
                links={networkData.edges}
              />
          : 'Loading...'
        }
      </section>
    </div>
  );
};

export default Home;
