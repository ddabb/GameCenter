// 网络请求封装
const BASE_URL = ''; // 基础URL

// 请求拦截器
const requestInterceptor = (config) => {
  // 可以在这里添加token等请求头
  return config;
};

// 响应拦截器
const responseInterceptor = (response) => {
  // 可以在这里统一处理响应数据
  return response;
};

// 错误处理
const handleError = (error) => {
  console.error('网络请求错误:', error);
  // 可以在这里统一处理错误，如弹窗提示
  return Promise.reject(error);
};

// 网络请求方法
const request = (options) => {
  const { url, method = 'GET', data = {}, header = {} } = options;
  
  const config = requestInterceptor({
    url: BASE_URL + url,
    method,
    data,
    header: {
      'content-type': 'application/json',
      ...header
    }
  });

  return new Promise((resolve, reject) => {
    wx.request({
      ...config,
      success: (res) => {
        const response = responseInterceptor(res);
        resolve(response);
      },
      fail: (error) => {
        reject(handleError(error));
      }
    });
  });
};

// GET请求
const get = (url, data = {}, header = {}) => {
  return request({ url, method: 'GET', data, header });
};

// POST请求
const post = (url, data = {}, header = {}) => {
  return request({ url, method: 'POST', data, header });
};

// PUT请求
const put = (url, data = {}, header = {}) => {
  return request({ url, method: 'PUT', data, header });
};

// DELETE请求
const del = (url, data = {}, header = {}) => {
  return request({ url, method: 'DELETE', data, header });
};

module.exports = {
  request,
  get,
  post,
  put,
  delete: del
};