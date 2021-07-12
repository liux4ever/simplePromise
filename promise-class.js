const PENDING = "pending";
const FULLFILLED = "fullfilled";
const REJECTED = "rejected";

class MyPromise {
  FULLFILLED_CALLBACK_LIST = [];
  REJECTED_CALLBACK_LIST = [];
  _status = PENDING;
  constructor(fn) {
    // 初始状态pending
    this.status = PENDING;
    this.value = null;
    this.reason = null;

    try {
      fn(this.resolve.bind(this), this.reject.bind(this));
    } catch (e) {
      this.reject(e);
    }
  }

  get status() {
    return this._status;
  }

  set status(newStatus) {
    this._status = newStatus;
    switch (newStatus) {
      case FULLFILLED:
        this.FULLFILLED_CALLBACK_LIST.forEach((callback) =>
          callback(this.value)
        );
        break;
      case REJECTED:
        this.REJECTED_CALLBACK_LIST.forEach((callback) =>
          callback(this.reason)
        );
        break;
    }
  }

  resolve(value) {
    if (this.status == PENDING) {
      this.value = value;
      this.status = FULLFILLED;
    }
  }
  reject(reason) {
    if (this.status == PENDING) {
      this.reason = reason;
      this.status = REJECTED;
    }
  }
  then(onFullfilled, onRejected) {
    // 如果不是一个函数，promise2以promise1的value触发fullfilled
    const realOnFullfilled = this.isFunction(onFullfilled)
      ? onFullfilled
      : (value) => {
          return value;
        };
    const realOnRejected = this.isFunction(onRejected)
      ? onRejected
      : (reason) => {
          throw reason;
        };
    // then的返回值整体是一个promise
    const promise2 = new MyPromise((resolve, reject) => {
      // onFullfilled 或 onRejected 异常时，promise reject
      const fullfilledMicrotask = () => {
        try {
          // onFullfilled 或 onRejected 执行结果为x，调用resolvePromise
          const x = realOnFullfilled(this.value);
          this.resolvePromise(promise2, x, resolve, reject);
        } catch (e) {
          reject(e);
        }
      };
      const rejectedMicrotask = () => {
        try {
          const x = realOnRejected(this.reason);
          this.resolvePromise(promise2, x, resolve, reject);
        } catch (e) {
          reject(e);
        }
      };
      // 调用then时,不同状态不同回调
      switch (this.status) {
        case FULLFILLED:
          // 调用传入的函数
          fullfilledMicrotask();
          break;
        case REJECTED:
          rejectedMicrotask();
          break;
        // 如果此时状态为 pending，先暂时存入数组中
        case PENDING:
          this.FULLFILLED_CALLBACK_LIST.push(realOnFullfilled);
          this.REJECTED_CALLBACK_LIST.push(realOnRejected);
          break;
      }
    });
    return promise2;
  }
  resolvePromise(promise2, x, resolve, reject) {
    if (promise2 === x) {
      return reject(
        new TypeError("the Promise and the return value are the same")
      );
    }
    // 如果x是一个promise，让新promise接收x
    if (x instanceof MyPromise) {
    }
  }
  // 判断是否是一个函数
  isFunction(val) {
    return typeof val == "function";
  }
}

// 实例化
// const promise = new MyPromise((resolve, reject) => {});
