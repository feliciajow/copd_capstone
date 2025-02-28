import React, { useState, useEffect } from 'react';
import { Alert, Button } from 'antd';
import * as XLSX from 'xlsx';
import { Table, Spin } from 'antd';

const PreviewFile = ({ file, proceed, prev }) => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const headers = [
    "Admit/Visit Date/Time",
    "Date of Birth",
    "Gender",
    "Race",
    "Death Date",
    "Case Type Description",
    "Primary Diagnosis Code (Mediclaim)",
    "Secondary Diagnosis Code Concat (Mediclaim)",
    "Discharge Date/Time",
    "Patient ID"
  ];

  const handleProceed = async () => {
    try {
      const response = await fetch("http://localhost:5002/train", {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.text();
      if (response.ok) {
        alert("Model Training Successful!");
        proceed();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert("Failed to start model training. Please try again!");
      console.error(error);
    }
  };
  
  useEffect(() => {
    console.log('File:', file);
    if (!file) {
      setError("No file provided.");
      setLoading(false);
      return;
    }

    const reader = new FileReader();
    reader.readAsArrayBuffer(file);

    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
          setError("Error reading the Excel file. The sheet might be empty.");
          setLoading(false);
          return;
        }

        // Extract headers from the first row
        const range = XLSX.utils.decode_range(sheet['!ref']);
        const actualHeaders = [];

        for (let C = range.s.c; C <= range.e.c; C++) {
          const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: C })];
          actualHeaders.push(cell ? cell.v.toString().trim().toLowerCase() : '');
        }

        console.log("Actual Headers from file:", actualHeaders); // Debugging logs

        // Normalize headers for case-insensitive comparison
        const normalizedHeaders = headers.map(header => header.toLowerCase().trim());

        // Check for missing headers
        const missingHeaders = normalizedHeaders.filter(requiredHeader =>
          !actualHeaders.includes(requiredHeader)
        );

        if (missingHeaders.length > 0) {
          setError(`Missing required columns: ${missingHeaders.join(", ")}. Please fix your file.`);
          setLoading(false);
          return;
        }

        // Parse data, ensuring empty cells are replaced with default values
        let parsedData = XLSX.utils.sheet_to_json(sheet, {
          header: headers,
          defval: "",
          raw: false
        });

        // Remove header row if it was included
        parsedData = parsedData.slice(1);

        if (parsedData.length === 0) {
          setError("The file appears to be empty. Please check the content and try again.");
          setLoading(false);
          return;
        }

        // Create columns dynamically
        const parsedColumns = headers.map(header => ({
          title: header,
          dataIndex: header,
          key: header,
        }));

        setColumns(parsedColumns);
        setData(parsedData);
        setError(null);
      } catch (err) {
        setError(`Error processing file: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError("Error reading file. Please try again.");
      setLoading(false);
    };

    // Prevent infinite loading if something goes wrong
    const timeout = setTimeout(() => setLoading(false), 5000);

    return () => clearTimeout(timeout);
  }, [file]);

  return (
    <div>
      {error && <Alert message={error} type="error" showIcon />}
      {loading ? (
        <div className="loading">
          <Spin size="large"/>
          <h2>Please wait patiently while we check your uploaded file...</h2>
        </div>
      ) : (
        <>
          {!error && (
            <Table
              columns={columns}
              dataSource={data}
              rowKey={(record, id) => id}
              pagination={{ pageSize: 50 }}
            />
          )}
          <br />
          <Button
            className="btns"
            style={{ width: '20%', margin: '0 8px' }}
            type="default"
            onClick={prev}
          >
            Back
          </Button>
          {!error && (
            <Button
              className="btns"
              style={{ width: '20%', margin: '0 8px', backgroundColor: '#29b6f6' }}
              type="primary"
              onClick={handleProceed}
            >
              Proceed
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default PreviewFile;