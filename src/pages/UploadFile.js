import React, { useState } from 'react';
import { CloudUploadOutlined, DownloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Upload, Button, Alert, message, Tooltip} from 'antd';
import ExcelTemplate from './downloadExcel';

const { Dragger } = Upload;

const UploadFile = ({ alert, setFile, fileupload, uploadModel }) => {
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadAlert, setUploadAlert] = useState(null);

  const handleUpload = () => {
    if (fileList.length === 0) {
      message.warning('No file selected for upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileList[0]); // Ensure we upload the raw file
    console.log("Uploading file:", fileList[0]);


    setUploading(true);

    fetch('http://localhost:5002/fileUpload', {
      method: 'POST',
      body: formData,
    })
      .then((res) => res.json())
      .then(() => {
        setFileList([]);
        setUploadAlert(null);
      })
      .catch(() => {
        message.error('Upload failed.');
      })
      .finally(() => {
        setUploading(false);
      });
  };

  const uploadProps = {
    beforeUpload: (file) => {
      const isCSV = file.type === 'text/csv';
      const isXlsx = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const isXls = file.type === 'application/vnd.ms-excel';

      if (!(isCSV || isXlsx || isXls)) {
        setUploadAlert(
          <Alert
            description={`${file.name} is not an xlsx, xls, or csv file`}
            type="error"
            showIcon
          />
        );
        return Upload.LIST_IGNORE;
      }

      // Clear previous alerts if any
      setUploadAlert(null);
      setFileList([file]);
      setFile(file); // Ensure only one file is allowed
      return false; // Prevent default upload behavior
    },
    onRemove: () => {
      setFileList([]);
    },
    fileList,
    multiple: false,
    maxCount: 1,
    accept: ".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel",
    showUploadList: {
      showDownloadIcon: true,
      downloadIcon: (file) => (
        <a href={file.url || URL.createObjectURL(file.originFileObj)} download={file.name}>
          <DownloadOutlined />
        </a>
      ),
      extra: ({ size = 0 }) => (
        <span style={{ color: '#000000' }}>
          ({(size / 1024 / 1024).toFixed(2)} MB)
        </span>
      ),
    },
  };

  return (
    <div>
      {uploadAlert}
      <h1 className="title">
        Upload File{' '}
        <Tooltip title="Upload a valid single CSV or XLSX file to retrain a new model." placement="topLeft">
          <InfoCircleOutlined style={{ fontSize: '17px', color: '#1890ff' }} />
        </Tooltip>
      </h1>
      <div className="card-container">
        <ExcelTemplate />
        <br />
        <Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <CloudUploadOutlined />
          </p>
          <p className="ant-upload-text">Click or drag file to this area to upload</p>
          <p className="ant-upload-hint">
            Support for a single file upload. Supported formats include csv, xls, or xlsx
          </p>
        </Dragger>

        <Button
          className="btns"
          style={{ width: '20%' }}
          type="primary"
          onClick={async () => {
            await handleUpload();
            uploadModel();
          }}
          loading={uploading}
          disabled={fileList.length === 0}
        >
          Upload File
        </Button>
      </div>
    </div>
  );
};

export default UploadFile;