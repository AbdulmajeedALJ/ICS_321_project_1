exports.executeQuery = async (req, res) => {
  try {
    const query = req.body?.query;
    console.log("Executing root query:", query);
    if (!query) {
      return res.status(400).json({
        status: "fail",
        message: "Request body must include a `query` property.",
      });
    }

    const [rows] = await req.app.locals.query(query); // reading from the mysql

    res.status(200).json({
      status: "success",
      results: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("Failed to execute custom query", err);
    res.status(500).json({
      status: "error",
      message: err.sqlMessage,
    });
  }
};
