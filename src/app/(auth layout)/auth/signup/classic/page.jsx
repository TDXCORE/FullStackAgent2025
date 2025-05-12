'use client'
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { faFacebook, faGoogle } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Card, Col, Container, Form, InputGroup, Row } from 'react-bootstrap';
import CommonFooter1 from '../../CommonFooter1';

//Image
import logo from '@/assets/img/logo-light.png';

const SignupClassic = () => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="hk-pg-wrapper pt-0 pb-xl-0 pb-5">
            <div className="hk-pg-body pt-0 pb-xl-0">
                <Container>
                    <Row>
                        <Col sm={10} className="position-relative mx-auto">
                            <div className="auth-content py-8">
                                <Form className="w-100">
                                    <Row>
                                        <Col xxl={5} xl={7} lg={8} sm={10} className="mx-auto">
                                            <div className="text-center mb-7">
                                                <Link className="navbar-brand me-0" href="/" >
                                                    <Image className="brand-img d-inline-block" src={logo} alt="brand" />
                                                </Link>
                                            </div>
                                            <Card className="card-border">
                                                <Card.Body>
                                                    <h4 className="text-center mb-0">Sign Up to Jampack</h4>
                                                    <p className="p-xs mt-2 mb-4 text-center">
                                                        Already a member ? <Link href="/auth/login/classic"><u>Sign In</u></Link>
                                                    </p>
                                                    <Button variant="outline-dark" className="btn-rounded btn-block mb-3">
                                                        <span>
                                                            <span className="icon">
                                                                <FontAwesomeIcon icon={faGoogle} />
                                                            </span>
                                                            <span>Sign Up with Gmail</span>
                                                        </span>
                                                    </Button>
                                                    <Button variant="social-facebook" className="btn-social btn-rounded btn-block">
                                                        <span>
                                                            <span className="icon">
                                                                <FontAwesomeIcon icon={faFacebook} />
                                                            </span>
                                                            <span>Sign Up with Facebook</span>
                                                        </span>
                                                    </Button>
                                                    <div className="title-sm title-wth-divider divider-center my-4"><span>Or</span></div>
                                                    <Row className="gx-3">
                                                        <Col lg={6} as={Form.Group} className="mb-3">
                                                            <Form.Label>Name</Form.Label>
                                                            <Form.Control placeholder="Enter your name" type="text" />
                                                        </Col>
                                                        <Col lg={6} as={Form.Group} className="mb-3">
                                                            <Form.Label>Username</Form.Label>
                                                            <Form.Control placeholder="Enter username" type="text" />
                                                        </Col>
                                                        <Col lg={12} as={Form.Group} className="mb-3">
                                                            <Form.Label>Email</Form.Label>
                                                            <Form.Control placeholder="Enter your email id" type="text" />
                                                        </Col>
                                                        <Col lg={12} as={Form.Group} className="mb-3">
                                                            <Form.Label>Password</Form.Label>
                                                            <InputGroup className="password-check">
                                                                <span className="input-affix-wrapper affix-wth-text">
                                                                    <Form.Control placeholder="6+ characters" type={showPassword ? "text" : "password"} />
                                                                    <a href="#" className="input-suffix text-primary text-uppercase fs-8 fw-medium" onClick={() => setShowPassword(!showPassword)} >
                                                                        {showPassword
                                                                            ?
                                                                            <span>Hide</span>
                                                                            :
                                                                            <span>Show</span>
                                                                        }
                                                                    </a>
                                                                </span>
                                                            </InputGroup>
                                                        </Col>
                                                    </Row>
                                                    <Form.Check id="logged_in" className="form-check-sm mb-3" >
                                                        <Form.Check.Input type="checkbox" defaultChecked />
                                                        <Form.Check.Label className="text-muted fs-7">
                                                            By creating an account you specify that you have read and agree with our <a href="#">Tearms of use</a> and <a href="#">Privacy policy</a>. We may keep you inform about latest updates through our default <a href="#">notification settings</a>
                                                        </Form.Check.Label>
                                                    </Form.Check>
                                                    <Button variant='primary' className="btn-rounded btn-uppercase btn-block" as={Link} href="/auth/login/classic" >Create account</Button>
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

export default SignupClassic
