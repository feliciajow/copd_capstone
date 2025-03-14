import { useNavigate } from 'react-router-dom';
import React from 'react';
import { Button, Result} from 'antd';

const TrainModel = ({}) => {
  const navigate = useNavigate();
  return (
    <div style={{ padding: '5%'}}>
      <Result
      status="success"
      title="Model Successfully Trained!"
      subTitle="Please visit the Models page to view your trained model."
      extra={[
        <Button className="btns" style={{ width: '20%', color:"white", backgroundColor:"#29b6f6"}} type="primary" onClick={() => navigate('/Models')}>
          Go To Models Page
        </Button>
      ]}
    />
    </div>
  )
};

export default TrainModel;