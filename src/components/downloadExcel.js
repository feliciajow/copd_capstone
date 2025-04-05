import React, {useState} from 'react';
import * as excel from 'xlsx';
import { Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

const ExcelTemplate=() =>{
    const [size, setSize] = useState('large');
    const downloadExcel = () => {
        //create column headers
        const headers = [
            ["Admit/Visit Date/Time", "Date of Birth", "Gender", "Race", "Death Date", "Case Type Description", "Primary Diagnosis Code (Mediclaim)", "Secondary Diagnosis Code Concat (Mediclaim)", "Discharge Date/Time", "Patient ID"],
            ["21/1/2019  5:07:00 pm", "4/7/1937  12:00:00 am", "FEMALE", "Chinese", "10/5/2022  11:59:00 pm", "A&E", "J44", "Y431||B002", "15/2/2019  1:14:00 pm", "A1234567"]
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
            <h3>Download template file:</h3>
            <Button size={size} type="default" icon={<DownloadOutlined />} onClick={downloadExcel}>
                COPD Asthma Excel Template
            </Button>
        </div>
    );
};
  
export default ExcelTemplate;