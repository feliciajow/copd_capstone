import React from 'react';
import * as excel from 'xlsx';
import { Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

const ExcelTemplate=() =>{
    const downloadExcel = () => {
        //create column headers
        const headers = [
            ["Admit/Visit Date/Time", "Date of Birth", "Gender", "Race", "Death Date", "Case Type Description", "Primary Diagnosis Code (Mediclaim)", "Secondary Diagnosis Code Concat (Mediclaim)", "Discharge Date/Time", "Patient ID"]
        ];
        const worksheet = excel.utils.aoa_to_sheet(headers);
        //create new excel workbook
        const workbook = excel.utils.book_new();
        //append a worksheet to the workbook
        excel.utils.book_append_sheet(workbook, worksheet, "Training Data");
        excel.writeFile(workbook,"training.xlsx")
    }
    return(
        <div className="card" style={{textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <p>Download template file:</p>
            <Button type="default" icon={<DownloadOutlined />} onClick={downloadExcel}>
                COPD Asthma Excel Template
            </Button>
        </div>
    );
};
  
export default ExcelTemplate;