const successResponse = (message, statusCode, data) => {
  if (data) {
    return {
      message,
      statusCode,
      data,
      success: true,
    };
  }
  return {
    message,
    statusCode,
    success: true,
  };
};

const failureResponse = (message, statusCode) => {
  return {
    message,
    statusCode,
    success: false,
  };
};

export default {
  successResponse,
  failureResponse,
};
