import React, { useState } from 'react';
import { Steps, Alert, message } from 'antd';
import UploadFile from './UploadFile'; 
import PreviewFile from './PreviewFile';
import TrainModel from './TrainModel';

const Retrain = ({ email }) => {
    //check if file has been uploaded
    const [fileupload, setfileupload] = useState(false);
    //track alert messages error or success
    const [alert, setalert] = useState(null);
    //track uploading stage
    const [current, setCurrent] = useState(0);
    //store uploaded excel file
    const [file, setFile] = useState(null);
    const prev = () => {
        setCurrent((prev) => prev - 1);

    };
    
    const uploadModel = () => {
        setfileupload(true);
        setCurrent((prev) => prev + 1);
        console.log('File uploaded successfully');
    };

    const proceed = () => {
        setCurrent((prev) => prev + 1);
    }

    const steps = [
        {
            title: 'Upload File',
            content: <UploadFile alert={setalert} setFile={setFile} fileupload={setfileupload} uploadModel={uploadModel} />,
        },
        {
            title: 'Preview file',
            content:  <PreviewFile file={file} proceed={proceed} prev={prev}/>, 
        },
        {
            title: 'Train Model',
            content: <TrainModel file={file}/>, 
        },
    ];

    const items = steps.map((item) => ({
        key: item.title,
        title: item.title,
    }));

    return (
        <div className="container">
            {email ? (
                <>
                    <Steps current={current} items={items} />
                    <br />
                    {alert}
                    <br />
                    {steps[current].content}
                </>
            ) : (
                <Alert description="You have to login to your account to train your file." type="info" showIcon />
            )}
        </div>
    );
};

export default Retrain;