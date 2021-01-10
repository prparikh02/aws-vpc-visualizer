import React, { useState } from 'react'
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
      setNetworkData(data);
    });
  };

  return (
    <div>
      <button onClick={callApi}>
        Call API
      </button>
      <div>
        {networkData && JSON.stringify(networkData)}
      </div>
      <section>
        {networkData
          ? <ForceGraph
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
