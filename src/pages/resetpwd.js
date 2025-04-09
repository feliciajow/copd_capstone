import React, { useState } from 'react';
import { Button, Row, Col, Form, Input, Flex, Modal, Result, Alert } from 'antd';
//import { useNavigate } from 'react-router-dom';
import '../styles/style.css';
import { useNavigate } from 'react-router-dom';

const ResetPwd = () => {
    const navigate = useNavigate();
    const [size, setSize] = useState('large');
    //track alert messages error
    const [alert, setalert] = useState(null)

    const onFinish = (values) => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");

        fetch("http://localhost:5000/api/users/resetpwd", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, password: values.password }),
        })
            .then((response) => {
                if (!response.ok) {
                    return response.json().then((data) => {
                        throw new Error(data.error || "Failed to reset password.");
                    });
                }
                return response.json();
            })
            .then(() => {
                setalert(
                    <Alert
                        description='Password reset successful! You may login now.'
                        type="success"
                        showIcon
                    />
                )
                setTimeout(() => {
                    navigate("/");
                }, 3000);
            })
            .catch((error) => {
                setalert(
                    <Alert
                        description={error.message}
                        type="error"
                        showIcon
                    />
                )
            });
    };

    return (
        <div className="login-container">
            {alert}
            <Row style={{ height: '100%' }}>
                <Col span={14} className='login-left' style={{ height: '100%', padding: 0 }}></Col>
                <Col span={10} style={{padding:"6%", marginTop:"4%"}}>
                    <Row>
                        <h1 style={{ fontSize: "30px" }}>Reset Password</h1>
                    </Row>
                    <Row>
                        <p style={{ fontSize: "17px" }}>Reset your password here.</p>
                    </Row>
                    <br />
                    <Form
                        name="basic"
                        size={size}
                        onFinish={onFinish}
                        //positioning of input box
                        labelCol={{
                            span: 6,
                        }}
                        //length of input box
                        wrapperCol={{
                            span: 22,
                        }}
                        style={{
                            maxWidth: 600,
                        }}
                        initialValues={{
                            remember: true,
                        }}
                        autoComplete="on"
                    >
                        <Form.Item style={{ textAlign: "left" }}
                            label="Password"
                            labelAlign="left"
                            name="password"
                            rules={[
                                {
                                    required: true,
                                    message: 'Please input your password!',
                                },
                                {
                                    //password minimum 8 characters
                                    min: 8,
                                    message: 'Passwords must be at least 8 characters long.'
                                }
                            ]}
                            hasFeedback
                        >
                            <Input.Password placeholder='Enter your password' />
                        </Form.Item>

                        <Form.Item style={{ textAlign: "left" }}
                            name="confirm"
                            label="Confirm Password"
                            labelAlign="left"
                            dependencies={['password']}
                            hasFeedback
                            rules={[
                                {
                                    required: true,
                                    message: 'Please confirm your password!',
                                },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value) {
                                            return Promise.resolve();
                                        }
                                        if (value !== getFieldValue('password')) {
                                            return Promise.reject(new Error('Confirm password entered do not match!'));
                                        }
                                        return Promise.resolve();
                                    },
                                }),
                            ]}
                        >
                            <Input.Password placeholder='Enter your confirm password' />
                        </Form.Item>


                        <Form.Item label={null}>
                            <Row>
                                <Col span={24}>
                                    <Button size={size} className="login-btns" type="primary" style={{ width: "100%", marginTop: "10px", backgroundColor: "#29b6f6" }} htmlType="submit">
                                        Reset Password
                                    </Button>
                                </Col>
                            </Row>
                            <Row>

                            </Row>
                        </Form.Item>
                    </Form>
                </Col>
            </Row>
        </div>

    );
};

export default ResetPwd;