'use client';

import { useState } from 'react';
import { Button, Card, Collapse } from 'react-bootstrap';
import Link from 'next/link';

const DebugTools = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="position-fixed bottom-0 end-0 m-3" style={{ zIndex: 1050 }}>
      <Button 
        variant="danger" 
        size="sm" 
        onClick={() => setOpen(!open)}
        className="rounded-circle"
        style={{ width: '40px', height: '40px' }}
      >
        <i className="ri-bug-line"></i>
      </Button>
      
      <Collapse in={open}>
        <div className="mt-2">
          <Card className="shadow-sm" style={{ width: '250px' }}>
            <Card.Header className="py-2">
              <h6 className="mb-0">Debug Tools</h6>
            </Card.Header>
            <Card.Body className="py-2">
              <ul className="list-group list-group-flush">
                <li className="list-group-item py-2">
                  <Link href="/apps/chat/debug" className="text-decoration-none">
                    API Debugger
                  </Link>
                </li>
                <li className="list-group-item py-2">
                  <Link href="/apps/chat/test-api" className="text-decoration-none">
                    API Test Tool
                  </Link>
                </li>
              </ul>
            </Card.Body>
          </Card>
        </div>
      </Collapse>
    </div>
  );
};

export default DebugTools;
