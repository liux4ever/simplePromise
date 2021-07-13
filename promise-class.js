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
        queueMicrotask(() => {
          try {
            // onFullfilled 或 onRejected 执行结果为x，调用resolvePromise
            const x = realOnFullfilled(this.value);
            this.resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        })
      };
      const rejectedMicrotask = () => {
        queueMicrotask(() => {
          try {
            const x = realOnRejected(this.reason);
            this.resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        })
      };
      // 调用then时,不同状态不同回调
      switch (this.status) {
        // 同步执行
        case FULLFILLED:
          // 调用传入的函数
          fullfilledMicrotask();
          break;
        // 同步执行
        case REJECTED:
          rejectedMicrotask();
          break;
        // 如果此时状态为 pending，先暂时存入数组中
        // 异步执行
        case PENDING:
          this.FULLFILLED_CALLBACK_LIST.push(realOnFullfilled);
          this.REJECTED_CALLBACK_LIST.push(realOnRejected);
          break;
      }
    });
    return promise2;
  }
  catch(onRejected) {
    this.then(null, onRejected)
  }

  resolvePromise(promise2, x, resolve, reject) {
    if (promise2 === x) {
      return reject(
        new TypeError("the Promise and the return value are the same")
      );
    }
    // 如果x是一个promise，让新promise接收x，即继续执行x
    if (x instanceof MyPromise) {
      queueMicrotask(() => {
        x.then((y) => {
          this.resolvePromise(promise2, y, resolve, reject)
        }, reject)
      })
    } else if (typeof x == 'object' || this.isFunction(x)) {
      if (x == null) {
        return resolve(x)
      }
      let then = null
      try {
        then = x.then
      } catch (e) {
        return reject(e)
      }
      // 如果then是一个函数
      if (this.isFunction(then)) {
        let called = false;
        try {
          then.call(x, (y) => {
            if (called) {
              return
            }
            called = true
            this.resolvePromise(promise2, y, resolve, reject)
          }, (r) => {
            if (called) {
              return
            }
            called = true
            reject(r)
          })
        } catch (e) {
          if (called) {
            return
          }
          reject(e)
        }
      } else {
        resolve(x)
      }
    } else {
      resolve(x)
    }
  }
  // 判断是否是一个函数
  isFunction(val) {
    return typeof val == "function";
  }

  static resolve(value) {
    if (value instanceof MyPromise) {
      return value
    }
    return new MyPromise((resolve) => {
      resolve(value)
    })
  }

  static reject(reason) {
    return new MyPromise((resolve, reject) => {
      reject(reason)
    })
  }

  static race(list) {
    return new MyPromise((resolve, reject) => {
      const length = list.length;
      if (!length) {
        return resolve()
      } else {
        for (let i = 0; i < length; i++) {
          MyPromise.resolve(list[i]).then(
            val => {
              return resolve(val),
                reason => {
                  return reject(reason)
                }
            })
        }
      }
    })
  }
}

// 实例化
const promise = new MyPromise((resolve, reject) => {
  resolve(111)
})
promise.then(val => { console.log('111') })
promise.then(val => { console.log('222') })

// const test1 = new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     resolve(111)
//   }, 1000)
// })
// const test2 = new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     resolve(222)
//   }, 2000)
// })
// const test3 = new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     resolve(333)
//   }, 3000)
// })
// MyPromise.race([test1, test2, test3]).then(val => {
//   console.log(val)
// })