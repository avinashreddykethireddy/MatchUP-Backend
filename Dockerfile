# Install node v16
FROM node:16-alpine

# Set the workdir /var/www/matchup
WORKDIR /usr/src/matchup

# Copy the package.json to workdir
COPY package.json /usr/src/matchup

# Run npm install - install the npm dependencies
RUN npm install

# Copy application source
COPY . .


# Expose application ports
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
