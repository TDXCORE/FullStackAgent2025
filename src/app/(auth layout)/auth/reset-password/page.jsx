'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import CommonFooter1 from '../CommonFooter1';

//image
import logo from '@/assets/img/logo-light.png';

const ResetPassword = () => {
    return (
        <div className="hk-pg-wrapper pt-0 pb-xl-0 pb-5">
            <div className="hk-pg-body pt-0 pb-xl-0">
                <Container>
                    <Row>
                        <Col sm={10} className="position-relative mx-auto">
                            <div className="auth-content py-8">
                                <Form className="w-100">
                                    <Row>
                                        <Col lg={5} md={7} sm={10} className="mx-auto">
                                            <div className="text-center mb-7">
                                                <Link href="/" className="navbar-brand me-0">
                                                    <Image className="brand-img d-inline-block" src={logo} alt="brand" />
                                                </Link>
                                            </div>
                                            <Card className="card-flush">
                                                <Card.Body className="text-center">
                                                    <h4>Reset your Password</h4>
                                                    <p className="mb-4">No worries we will mail you 6 digit code to your recovery email address to reset your password</p>
                                                    <Row className="gx-3">
                                                        <Col lg={12} as={Form.Group} className="mb-3">
                                                            <div className="form-label-group">
                                                                <Form.Label htmlFor="userName">Email</Form.Label>
                                                                <a href="#" className="fs-7 fw-medium">Forgot Username ?</a>
                                                            </div>
                                                            <Form.Control id="userName" placeholder="Recovery email ID" type="email" />
                                                        </Col>
                                                    </Row>
                                                    <Button variant="primary" className="btn-uppercase btn-block">Send Code</Button>
                                                    <p className="p-xs mt-2 text-center">Did not receive code? <a href="#"><u>Send again</u></a></p>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>
                                </Form>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>
            {/* Page Footer */}
            <CommonFooter1 />
        </div>

    )
}

export default ResetPassword
