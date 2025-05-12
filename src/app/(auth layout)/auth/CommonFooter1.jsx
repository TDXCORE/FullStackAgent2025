import { Col, Container, Row } from 'react-bootstrap';

const CommonFooter1 = () => {
    return (
        <div className="hk-footer border-0">
            <Container as="footer" className="footer">
                <Row>
                    <Col xl={8} className="text-center">
                        <p className="footer-text pb-0">
                            <span className="copy-text">Jampack © {new Date().getFullYear()} All rights reserved.</span>
                            <a href="#">Privacy Policy</a>
                            <span className="footer-link-sep">|</span><a href="#">T&amp;C</a><span className="footer-link-sep">|</span><a href="#">System Status</a>
                        </p>
                    </Col>
                </Row>
            </Container>
        </div>
    )
}

export default CommonFooter1
