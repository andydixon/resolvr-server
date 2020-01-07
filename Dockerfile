FROM node:10
RUN apt update; apt -y install memcached; apt clean
ADD src /src
WORKDIR /src
RUN ls -la ./
RUN npm install
EXPOSE 53/tcp
EXPOSE 53/udp
EXPOSE 61327/tcp
CMD [ "sh","run.sh" ]
