import { Button, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <Container className="d-flex align-items-center justify-content-center py-5" style={{ minHeight: '70vh' }}>
      <div className="text-center">
        <div className="display-3 fw-bold mb-3">404</div>
        <h1 className="mb-3">Page not found</h1>
        <p className="text-muted mx-auto mb-4" style={{ maxWidth: '32rem' }}>
          That page is not on Hank&apos;s Tank. Jump back to the homepage, today&apos;s games, or
          the prediction board.
        </p>
        <div className="d-flex flex-wrap justify-content-center gap-2">
          <Button as={Link} to="/" variant="primary">
            Home
          </Button>
          <Button as={Link} to="/games" variant="outline-secondary">
            Games
          </Button>
          <Button as={Link} to="/predictions" variant="outline-secondary">
            Predictions
          </Button>
        </div>
      </div>
    </Container>
  );
}

export default NotFoundPage;
