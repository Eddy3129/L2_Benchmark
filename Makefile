# Makefile for starting all services

.PHONY: help start stop clean install hardhat postgres backend frontend dev

# Default target
help:
	@echo "Available commands:"
	@echo "  make start     - Start all services (Hardhat, PostgreSQL, Backend, Frontend)"
	@echo "  make dev       - Start all services in development mode"
	@echo "  make stop      - Stop all services"
	@echo "  make clean     - Stop and clean all services"
	@echo "  make install   - Install dependencies for all projects"
	@echo "  make hardhat   - Start only Hardhat node"
	@echo "  make postgres  - Start only PostgreSQL"
	@echo "  make backend   - Start only Backend"
	@echo "  make frontend  - Start only Frontend"

# Install dependencies for all projects
install:
	@echo "Installing root dependencies..."
	npm install
	@echo "Installing backend dependencies..."
	cd backend && npm install
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "All dependencies installed!"

# Start PostgreSQL using Docker Compose
postgres:
	@echo "Starting PostgreSQL..."
	cd backend && docker-compose up -d db
	@echo "PostgreSQL started on port 5432"

# Start Hardhat node
hardhat:
	@echo "Starting Hardhat node..."
	npx hardhat node &
	@echo "Hardhat node started on port 8545"

# Start Backend
backend:
	@echo "Starting Backend..."
	cd backend && npm run start:dev &
	@echo "Backend starting on port 3001 (or configured port)"

# Start Frontend
frontend:
	@echo "Starting Frontend..."
	cd frontend && npm run dev &
	@echo "Frontend starting on port 3000"

# Start all services
start: postgres
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 5
	@$(MAKE) hardhat
	@sleep 3
	@$(MAKE) backend
	@sleep 3
	@$(MAKE) frontend
	@echo ""
	@echo "All services started!"
	@echo "- Hardhat node: http://localhost:8545"
	@echo "- PostgreSQL: localhost:5432"
	@echo "- Backend: http://localhost:3001 (check backend logs for actual port)"
	@echo "- Frontend: http://localhost:3000"
	@echo ""
	@echo "To stop all services, run: make stop"

# Development mode (same as start but with more verbose output)
dev: start

# Stop all services
stop:
	@echo "Stopping all services..."
	@pkill -f "hardhat node" || echo "No Hardhat process to kill"
	@pkill -f "nest start" || echo "No Backend process to kill"
	@pkill -f "next dev" || echo "No Frontend process to kill"
	@cd backend && docker-compose down
	@echo "All services stopped!"

# Clean everything (stop services and remove containers/volumes)
clean:
	@echo "Cleaning all services..."
	@pkill -f "hardhat node" || echo "No Hardhat process to kill"
	@pkill -f "nest start" || echo "No Backend process to kill"
	@pkill -f "next dev" || echo "No Frontend process to kill"
	@cd backend && docker-compose down -v
	@echo "All services cleaned!"