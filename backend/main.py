from src.app import app


def main() -> None:
    app.run(debug=True, host="0.0.0.0", port=8050)


if __name__ == "__main__":
    main()
