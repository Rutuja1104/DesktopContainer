import { ipcRenderer } from 'electron';
const remote = require('@electron/remote')
import * as React from 'react'
import { Button, Form, Spinner } from 'react-bootstrap';
import '../assets/styles.css'

const EnablementKeyLogin = () => {
  const [enablementKey, setEnablementKey] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    ipcRenderer.on('get-device', async (event, content) => {
      if(content === "Success") {
        ipcRenderer.send("auth-success", content);
        remote.getCurrentWindow().close();
      } else if(content === "Error") {
        alert("Invalid enablement key")
      }
      setIsLoading(false);
    })

    return () => {
      ipcRenderer.removeAllListeners('get-device');
    };
  }, [])

  const onFormSubmit = () => {
    setIsLoading(true);
    ipcRenderer.send("check-enablement", { enablementKey });
    remote.getCurrentWindow().close();
  }

  const enablementHandler = e => {
    setEnablementKey(e.target.value)
  }

  return (
    <div className='enablement-box'>
      <Form>
        <div className="file-container">
          <div className="text-area">
            <Form.Group 
              className="mb-4" 
              controlId="exampleForm.ControlTextarea1"
            >
              <Form.Label>Enter Enablement Key</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                placeholder="Enter your enablement key..." 
                onChange={enablementHandler} 
                className='textField' 
              />
            </Form.Group>
          </div>
          <Button 
            type="submit" 
            variant="primary" 
            onClick={onFormSubmit} 
            disabled={isLoading || !enablementKey}
            style={{ width: "100%", height: "40px"}}
          >
            {isLoading ? <Spinner animation="border" size="sm" /> : 'Submit'}
          </Button>
        </div>
      </Form>
    </div>
  )
}

export default EnablementKeyLogin;
