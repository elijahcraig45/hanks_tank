import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, ListGroup, Badge, Image } from 'react-bootstrap';

function HomePage() {
  const [newsData, setNewsData] = useState({ mlb: [], braves: [] });

  useEffect(() => {
    const fetchData = async () => {
      const apiUrl = process.env.REACT_APP_API_URL;
      const mlbEndpoint = `${apiUrl}/mlb-news`;
      const bravesEndpoint = `${apiUrl}/braves-news`;

      try {
        const [mlbNews, bravesNews] = await Promise.all([
          fetch(mlbEndpoint),
          fetch(bravesEndpoint),
        ]);

        if (!mlbNews.ok || !bravesNews.ok) {
          throw new Error('Network response was not ok');
        }

        const mlbData = await mlbNews.json();
        const bravesData = await bravesNews.json();
        setNewsData({ mlb: mlbData.articles, braves: bravesData.articles });
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    fetchData();
  }, []);

  const sortNewsByDate = (newsArray) => {
    return newsArray.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  };

  return (
    <Container fluid="lg" className="py-5">
      <Row className="g-4">
        <Col xs={12} lg={8}>
          <Card>
            <Card.Header as="h5" className="text-center">Trending News</Card.Header>
            <ListGroup variant="flush">
              {[...newsData.mlb.slice(0, 3), ...newsData.braves.slice(0, 3)].map((article, index) => (
                <ListGroup.Item key={index} className="d-flex align-items-center">
                  <Image src={article.urlToImage} alt="Article image" rounded style={{ width: '80px', height: '80px', marginRight: '20px', objectFit: 'cover' }} />
                  <div>
                    <h6 className="mb-0">
                      <Badge bg={index < 3 ? "primary" : "secondary"} className="me-2">{index < 3 ? "MLB" : "Braves"}</Badge>
                      <a href={article.url} target="_blank" rel="noopener noreferrer" className="link-dark">
                        {article.title}
                      </a>
                    </h6>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        </Col>
        <Col xs={12} lg={4}>
          {/* This space can be used for current standings, upcoming games, or any other relevant information. */}
          <Card>
            <Card.Header as="h5" className="text-center">Current Standings</Card.Header>
            {/* Standings or other content goes here */}
          </Card>
        </Col>
      </Row>
      <Row className="g-4 mt-4">
        <Col xs={12} md={6}>
          <Card>
            <Card.Header as="h5">MLB News</Card.Header>
            <ListGroup variant="flush">
              {sortNewsByDate(newsData.mlb).slice(10, 20).map((item, index) => (
                <ListGroup.Item key={index} className="d-flex align-items-center">
                  <Image src={item.urlToImage} alt="" rounded style={{ width: '60px', height: '60px', marginRight: '15px', objectFit: 'cover' }} />
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="link-dark">
                    {item.title}
                  </a>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Card.Header as="h5">Braves News</Card.Header>
            <ListGroup variant="flush">
              {sortNewsByDate(newsData.braves).slice(10, 20).map((item, index) => (
                <ListGroup.Item key={index} className="d-flex align-items-center">
                  <Image src={item.urlToImage} alt="" rounded style={{ width: '60px', height: '60px', marginRight: '15px', objectFit: 'cover' }} />
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="link-dark">
                    {item.title}
                  </a>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default HomePage;
