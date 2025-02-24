import React, { useState } from 'react';
import { Button, Row, Col, Form, Input, Flex, Modal, Result, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import './style.css';
import Dashboard from './dashboard';

const Login = ({ handleLogin }) => {
  const navigate = useNavigate();
  //open modal pop up
  const [isModalOpen, setIsModalOpen] = useState(false);
  //track alert messages error
  const [alert, setalert] = useState(null)

  const openModal = () => {
    setIsModalOpen(true)
  }
  const handleCancel = () => {
    setIsModalOpen(false);
  };
  const handleConfirm = () => {
    setIsModalOpen(true);
  }
  //submit buttons for login
  const onFinish = (values) => {
    fetch('http://localhost:5000/loggedin', {
      method: 'POST',
      headers: { "Content-Type": "application/json" }, //telling server the type of content that we are sending with this req
      body: JSON.stringify({ email: values.email, password: values.password }), //actual content email and password
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.error || 'Login failed');
          });
        }
        return response.json();
      })
      .then(() => {
        console.log('Success:', values);
        handleLogin(values.email);
        navigate('/dashboard', { state: { email: values.email } });
      })
      .catch((error) => { //handle errors from fetch response
        setalert(
          <Alert
            description={error.message}
            type="error"
            showIcon
          />)
      })
  };

  //submit buttons for forget pwd
  const onEmailSubmit = (values) => {
    fetch('http://localhost:5000/forgetpwd', {
      method: 'POST',
      headers: { "Content-Type": "application/json" }, //telling server the type of content that we are sending with this req
      body: JSON.stringify({ email: values.email }), //actual content email and password
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.error || 'No email registered.');
          });
        }
        return response.json();
      })
      .then(() => {
        console.log('Success:', values);
      })
      .catch((error) => { //handle errors from fetch response
        setalert(
          <Alert
            description={error.message}
            type="error"
            showIcon
          />)
      })
  };

  const onFinishFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  return (
    <div className="login-container" style={{ padding: "60px" }}>
      {alert}
      <div className="login-card">
        <Row style={{ height: '65vh' }}>
          <Col span={1}></Col>
          <Col span={13}>
            <Row>
              <h1>Welcome Back</h1>
            </Row>
            <Row>
              <p style={{ fontSize: "17px" }}>Enter your credentials to continue.</p>
            </Row>
            <br />
            <Form
              name="basic"
              //positioning of input box
              labelCol={{
                span: 4,
              }}
              //length of input box
              wrapperCol={{
                span: 18,
              }}
              style={{
                maxWidth: 600,
              }}
              initialValues={{
                remember: true,
              }}
              onFinish={onFinish}
              onFinishFailed={onFinishFailed}
              autoComplete="on"
            >
              <Form.Item style={{ textAlign: "left" }}
                name="email"
                label="Email"
                labelAlign="left"
                rules={[
                  {
                    type: 'email',
                    message: 'Please enter a valid email!',
                  },
                  {
                    required: true,
                    message: 'Please input your email!',
                  },
                ]}
                hasFeedback
              >
                <Input placeholder='Enter your email' />
              </Form.Item>

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

              <Form.Item label={null}>
                <Row>
                  <Col span={6}>
                    <Flex justify="space-between" align="left">
                      <a href='#' onClick={openModal}>Forgot password</a>
                    </Flex>
                  </Col>
                  <Col span={12}></Col>
                  <Col span={6}>
                    <a href='/about'> Continue as guest</a>
                  </Col>
                </Row>
                <Row>
                  <Col span={24}>
                    <Button className="login-btns" type="primary" style={{ width: "100%", marginTop: "10px", backgroundColor: "#29b6f6" }} htmlType="submit">
                      Login
                    </Button>
                  </Col>
                </Row>
                <Row>
                  <Col span={24}>
                    <p style={{ fontSize: "13px" }}>Don't have an account? <a href='#' onClick={() => navigate('/signup')}> Register</a></p>
                  </Col>
                </Row>
              </Form.Item>
            </Form>
          </Col>
          <Col span={9} className='login-left'></Col>
        </Row>
      </div>
      <Modal open={isModalOpen} footer={null} onCancel={handleCancel} maskClosable={false}>
        <Result
          title="Forgot Password"
          extra={[
            <Form onFinish={onEmailSubmit} onFinishFailed={(errorInfo) => console.log('Failed:', errorInfo)}>
              <Form.Item style={{ textAlign: "left" }}
                name="email"
                label="Email"
                labelAlign="left"
                rules={[
                  {
                    type: 'email',
                    message: 'Please enter a valid email!',
                  },
                  {
                    required: true,
                    message: 'Please input your email!',
                  },
                ]}
                hasFeedback
              >
                <Input placeholder="Enter your email" />
              </Form.Item>
              <Form.Item>
                <Button className="forgotpwd-btns" type="default" htmlType="submit">
                  Send Reset Link
                </Button>
              </Form.Item>
            </Form>

          ]}
        />
      </Modal>
    </div>

  );
};

export default Login;