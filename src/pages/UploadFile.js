import React, { useState, useEffect } from 'react';
import { CloudUploadOutlined, DownloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Upload, Button, Alert, message, Tooltip, Select, Input, Row, Col } from 'antd';
import ExcelTemplate from './downloadExcel';
import * as XLSX from "xlsx";
import icd10Excel from "../data/icd10_code.xlsx";
import '../styles/style.css';

const { Dragger } = Upload;
const { Option } = Select;

const UploadFile = ({ alert, setFile, fileupload, uploadModel }) => {
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadAlert, setUploadAlert] = useState(null);
  const [modelName, setModelName] = useState("");
  const [diagnosticInterest, setDiagnosticInterest] = useState("J44");
  const [diagnosticOptions, setDiagnosticOptions] = useState([
    { code: "J44", description: "COPD" },
    { code: "I10", description: "Hypertension" },
    { code: "E11", description: "Diabetes Mellitus" }
  ]);

  // Function to load and parse the Excel file
  const loadICDCodesFromFile = async () => {
    try {
      const response = await fetch(icd10Excel);
      const blob = await response.blob();

      const reader = new FileReader();
      reader.readAsBinaryString(blob);

      reader.onload = (e) => {
        const binaryStr = e.target.result;
        const workbook = XLSX.read(binaryStr, { type: "binary" });

        if (workbook.SheetNames.length === 0) {
          throw new Error("No sheets found in the Excel file.");
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
          throw new Error("Sheet is empty or invalid.");
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          throw new Error("Excel file has no data.");
        }

        // Extract ICD-10 codes
        const extractedCodes = jsonData.map(row => {
          if (row["ICD-10 Combined"]) {
            const [code, ...descParts] = row["ICD-10 Combined"].split(": ");
            return { code, description: descParts.join(": ") || "No description available" };
          }
          return null;
        }).filter(Boolean);

        setDiagnosticOptions((prevOptions) => {
          const newOptions = [...prevOptions, ...extractedCodes].filter((item, index, self) =>
            index === self.findIndex((t) => t.code === item.code)
          );
          return newOptions;
        });

        message.success("ICD-10 codes loaded from Excel file!");
      };
    } catch (error) {
      console.error("Error loading Excel file:", error);
      message.error("Error loading ICD-10 codes: " + error.message);
    }
  };

  // Load the Excel file when the component mounts
  useEffect(() => {
    loadICDCodesFromFile();
  }, []);

  const handleModelNameChange = (e) => {
    setModelName(e.target.value);
  };

  const handleUpload = () => {
    if (!modelName) {
      message.warning('Model name is required');
      return;
    }
    if (fileList.length === 0) {
      message.warning('No file selected for upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileList[0]); // Ensure we upload the raw file
    console.log("Uploading file:", fileList[0]);
    formData.append("diagnostic_interest", diagnosticInterest);
    formData.append("model_name", modelName);
    console.log("Model Name:", modelName);
    console.log("Selected Diagnostic Interest:", diagnosticInterest);

    setUploading(true);

    fetch('http://localhost:5002/fileUpload', {
      method: 'POST',
      body: formData,
    })
      .then((res) => res.json())
      .then(() => {
        setFileList([]);
        setUploadAlert(null);
        setModelName('');
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
        <Row>
          <Col md={6}>
            <label style={{ fontWeight: "bold", marginBottom: "8px", display: "block", textAlign: "left" }}>
              Name Your Model:
            </label>
            <Tooltip
              trigger={['focus']}
              title="Model name should be no longer than 10 characters"
              placement="topLeft"
            >
            <Input
              type="text"
              placeholder="Enter model name"
              value={modelName}
              onChange={handleModelNameChange}
              maxLength={10}
              style={{ width: "100%", marginBottom: "16px", padding: "8px" }}
            />
            </Tooltip>
          </Col>
        </Row>
        <Row>
          <Col md={6}>
            <label style={{ fontWeight: "bold", marginBottom: "8px", display: "block", textAlign: "left" }}>
              Select Diagnostic Interest:
            </label>
            <Select
              showSearch
              value={diagnosticInterest}
              onChange={(value) => {
                const shortCode = value.substring(0, 3); // Extract first 3 letters
                setDiagnosticInterest(shortCode);
              }}
              style={{ width: "100%", marginBottom: "16px", textAlign: "left" }}
              placeholder="Search or select a diagnostic code"
              optionFilterProp="children"
              filterOption={(input, option) =>
                String(option.children).toLowerCase().includes(input.toLowerCase())
              }
            >
              {diagnosticOptions.map(({ code, description }) => (
                <Option key={code} value={code}>
                  {`${code} (${description})`}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
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
            uploadModel(modelName);
          }}
          loading={uploading}
          disabled={fileList.length === 0 || !modelName}
        >
          Upload File
        </Button>
      </div>
    </div>
  );
};

export default UploadFile;