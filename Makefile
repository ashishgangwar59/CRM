build-website:
	docker build . -t website-image -f Dockerfile.production

run-website:
	docker-compose -f docker-compose.yml up -d

stop-website:
	docker-compose -f docker-compose.yml down
