import React, { useState, useRef, useEffect } from 'react';
import { Table, Alert, Card, Badge, Row, Col, Button, Tooltip, DatePicker } from 'antd';
import { useNavigate } from 'react-router-dom';
import { InfoCircleOutlined } from '@ant-design/icons';
const { RangePicker } = DatePicker;

const Models = ({ email }) => {
    const [fetchModel, setfetchModel] = useState([]);
    const [filteredModels, setFilteredModels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [searchedColumn, setSearchedColumn] = useState('');
    const navigate = useNavigate();
    const [size, setSize] = useState('large');
    const getColumnSearchProps = (dataIndex) => ({

    });

    useEffect(() => {
        if (email) {
            fetchModels();
        }
    }, [email]);

    const fetchModels = () => {
        setLoading(true);
        fetch('http://localhost:5000/api/users/model', {
            method: 'GET',
            headers: { "Content-Type": "application/json", "Email": email },
        })
            .then((response) => {
                if (!response.ok) {
                    return response.json().then((data) => {
                        throw new Error(data.error || 'Fetch Model Failed');
                    });
                }
                return response.json();
            })
            .then((model) => {
                console.log(model);
                setfetchModel(model);
                setFilteredModels(model);
            })
            .catch((error) => {
                setAlert(
                    <Alert
                        description={error.message}
                        type="info"
                        showIcon
                        className="mb-4"
                    />
                );
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const handleDateFilter = (dates) => {
        if (!dates || dates.length === 0) {
            setFilteredModels(fetchModel);
            return;
        }
        const [start, end] = dates;
        const filtered = fetchModel.filter((model) => {
            const modelDate = new Date(model.timestamp);
            return modelDate >= start.toDate() && modelDate <= end.toDate();
        });
        setFilteredModels(filtered);
    };
    
    const columns = [
        {
            title: 'Model ID',
            dataIndex: 'modelid',
            key: 'modelid',
            width: '15%',
            fixed: 'left',
        },
        {
            title: 'Model Name',
            dataIndex: 'model_name',
            key: 'model_name',
            width: '15%',
            fixed: 'left',
        },
        {
            title: (
                <>
                    C Index{' '}
                    <Tooltip title="Concordance index (C-index) indicates model performance. The higher, the better." placement="top">
                        <InfoCircleOutlined style={{ fontSize: '17px', color: '#1890ff' }} />
                    </Tooltip>
                </>
            ),
            dataIndex: 'c_index',
            key: 'c_index',
            width: '15%',
            sorter: {
                compare: (a, b) => a.c_index - b.c_index,
            },
            ...getColumnSearchProps('c_index'),
        },
        {
            title: 'Created At',
            dataIndex: 'timestamp',
            key: 'created_time',
            width: '25%',
            render: (text) => new Date(text).toLocaleString(),
            sorter: {
                compare: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            },
        },

        {
            title: (
                <>
                    Expiration Date{' '}
                    <Tooltip title="Model Expiration Date" placement="top">
                        <InfoCircleOutlined style={{ fontSize: '17px', color: '#1890ff' }} />
                    </Tooltip>
                </>
            ),
            dataIndex: 'expire_date',
            key: 'expire_date',
            width: '15%',
            render: (text) => new Date(text).toLocaleString(),
            sorter: {
                compare: (a, b) => new Date(a.expire_date).getTime() - new Date(b.expire_date).getTime()
            },
        },
    ];

    return (
        <div>
            <br />
            {/* <div className = "alerts" style={{ padding: '1%' }}>{alert}</div> */}
            {!email ? (
                <div style={{ padding: '3%' }}><Alert description="You have to login to your account to view models." type="info" showIcon /></div>
            ) : (
                <>
                    <div className="model-card">
                        <Row>
                            <Col span={5}>
                                <h1 style={{ textAlign: 'left' }}>Models History{' '}
                                    <Tooltip title="All models trained by users on BreatheAI." placement="top">
                                        <InfoCircleOutlined style={{ fontSize: '17px', color: '#1890ff' }} />
                                    </Tooltip>
                                </h1>
                            </Col>

                            <Col span={15}>
                            </Col>
                            <Col span={2}>
                                <Button type="default" size={size} onClick={fetchModels}>Refresh</Button>
                            </Col>
                            <Col span={2}>
                                <Button size={size} style={{ backgroundColor: "#29b6f6", color: "white" }} onClick={() => navigate('/retrain')}>+ Train New Model</Button>
                            </Col>
                        </Row>
                        <Row>
                            <Col span={8}>
                                <RangePicker
                                    picker="month"
                                    onChange={handleDateFilter}
                                    disabledDate={(current)=> current && current > new Date()}
                                    style={{ marginBottom: '16px', width: '100%' }}
                                />
                            </Col>
                        </Row>
                        <Row style={{ background: 'transparent', border: "transparent" }}>
                            <Col span={24}>
                                <Table
                                    columns={columns}
                                    dataSource={filteredModels}
                                    rowKey="modelid"
                                    loading={loading}
                                    scroll={{ x: 1500 }}
                                    sortMultiple={true}
                                    pagination={{
                                        pageSize: 10,
                                        showTotal: (total) => `Total ${total} models`,
                                    }}
                                />
                            </Col>
                        </Row>
                    </div>
                </>
            )}
        </div>
    );
};

export default Models;