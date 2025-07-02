FROM dart:3.8.0
WORKDIR /app
COPY pubspec.yaml .
COPY bin/ ./bin/
RUN dart pub get
EXPOSE 8080
CMD ["dart", "run", "bin/api/index.dart"]