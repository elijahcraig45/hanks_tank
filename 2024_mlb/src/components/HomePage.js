import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, ListGroup, Badge } from 'react-bootstrap';

function HomePage() {
  const [newsData, setNewsData] = useState({ mlb: [], braves: [] });

  useEffect(() => {
    const fetchData = async () => {
      // Fetch logic remains the same, ensure the correct paths to your JSON files
      const [mlbNews, bravesNews] = await Promise.all([
        fetch('/data/2024_mlb_news.json'),
        fetch('/data/2024_braves_news.json'),
      ]);
      const mlbData = await mlbNews.json();
      const bravesData = await bravesNews.json();
      setNewsData({ mlb: mlbData.articles, braves: bravesData.articles });
    };

    fetchData();
  }, []);

  const sortNewsByDate = (newsArray) => {
    return newsArray.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  };

  return (
    <Container className="dark-theme" bg="dark" data-bs-theme="dark">
      <Row className="my-5">
        <Col xs={12} md={6}>
          <Card className="mb-4">
            <Card.Body>
              <h3>Hot News</h3>
              <ListGroup>
                {newsData.mlb.slice(0, 3).map((article, index) => (
                  <ListGroup.Item key={index} className="d-flex align-items-center">
                    <img src={article.urlToImage} alt="" style={{ width: '100px', marginRight: '10px' }} />
                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                      <Badge bg="danger">MLB</Badge> {article.title}
                    </a>
                  </ListGroup.Item>
                ))}
                {newsData.braves.slice(0, 3).map((article, index) => (
                  <ListGroup.Item key={index} className="d-flex align-items-center">
                    <img src={article.urlToImage} alt="" style={{ width: '100px', marginRight: '10px' }} />
                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                      <Badge bg="warning">Braves</Badge> {article.title}
                    </a>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          {/* Current Standings or other content */}
        </Col>
      </Row>
      <Row>
        <Col xs={12}>
          <Row>
            <Col xs={12} md={6}>
              <h4>MLB</h4>
              <ListGroup>
                {sortNewsByDate(newsData.mlb).slice(10, 20).map((item, index) => (
                  <ListGroup.Item key={index} className="d-flex align-items-center">
                    <img src={item.urlToImage} alt="" style={{ width: '60px', marginRight: '10px' }} />
                    <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Col>
            <Col xs={12} md={6}>
              <h4>Braves</h4>
              <ListGroup>
                {sortNewsByDate(newsData.braves).slice(10, 20).map((item, index) => (
                  <ListGroup.Item key={index} className="d-flex align-items-center">
                    <img src={item.urlToImage} alt="" style={{ width: '60px', marginRight: '10px' }} />
                    <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
}

export default HomePage;
