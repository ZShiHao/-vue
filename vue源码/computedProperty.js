// computed属性实现原理
// 函数执行栈
// 1._init(options)
// 2.initState(vm)
// 3.initComputed(vm,opts.computed)
//   getter=userDef
//   userDef是用户定义的getter方法
// 4.defineComputed(vm,key,userDef)

function noop(a, b, c) { }  // 表示一个函数,并且这个函数什么都不操作

var sharedPropertyDefinition = {
 // 属性描述符
 // 定义vue实例的属性
 enumerable: true, // 该属性可被对象枚举
 configurable: true, // true属性描述符可以被改变
 get: noop,  // 属性的getter函数
 set: noop   // 属性的setter函数
};

function initComputed (vm, computed) {
 // $flow-disable-line
 var watchers = vm._computedWatchers = Object.create(null); // 创建一个空对象
 // computed properties are just getters during SSR
 var isSSR = isServerRendering();

 for (var key in computed) {
   var userDef = computed[key];
   var getter = typeof userDef === 'function' ? userDef : userDef.get;
   if (getter == null) {
     warn(
       ("Getter is missing for computed property \"" + key + "\"."),
       vm
     );
   }

   if (!isSSR) {
     // create internal watcher for the computed property.
     // 为每个计算属性创建一个Watcher实例
     watchers[key] = new Watcher(
       vm,
       getter || noop,
       noop,
       computedWatcherOptions
     );
   }

   // component-defined computed properties are already defined on the
   // component prototype. We only need to define computed properties defined
   // at instantiation here.
   if (!(key in vm)) {
     defineComputed(vm, key, userDef);
   } else {
     if (key in vm.$data) {
       warn(("The computed property \"" + key + "\" is already defined in data."), vm);
     } else if (vm.$options.props && key in vm.$options.props) {
       warn(("The computed property \"" + key + "\" is already defined as a prop."), vm);
     } else if (vm.$options.methods && key in vm.$options.methods) {
       warn(("The computed property \"" + key + "\" is already defined as a method."), vm);
     }
   }
 }
}

function defineComputed(
 target: any,   // Vue实例
 key: string,   // 需要向vue实例上挂载的计算属性
 userDef: Object | Function  // 用户定义的getter方法(两种形式)
) {
 // 配置属性描述符
 const shouldCache = !isServerRendering() // 是否需要缓存
 if (typeof userDef === 'function') { // 用户直接定义getter函数
  sharedPropertyDefinition.get = shouldCache
   ? createComputedGetter(key) // 需要缓存,给计算属性创建getter函数
   : createGetterInvoker(userDef) // 不需要缓存,直接
  sharedPropertyDefinition.set = noop
 } else {  // 用户通过对象的形式,对象方法中定义get()函数
  sharedPropertyDefinition.get = userDef.get
   ? shouldCache && userDef.cache !== false
    ? createComputedGetter(key)
    : createGetterInvoker(userDef.get)
   : noop
  sharedPropertyDefinition.set = userDef.set || noop
 }
 if (process.env.NODE_ENV !== 'production' &&
  sharedPropertyDefinition.set === noop) {
  sharedPropertyDefinition.set = function () {
   warn(
    `Computed property "${key}" was assigned to but it has no setter.`,
    this
   )
  }
 }
 // 为vue实例挂载计算属性
 Object.defineProperty(target, key, sharedPropertyDefinition)
}

function createComputedGetter (key) {
 return function computedGetter () {
  // 计算属性的getter函数
   var watcher = this._computedWatchers && this._computedWatchers[key];
   if (watcher) {
     if (watcher.dirty) {
       watcher.evaluate();
     }
     if (Dep.target) {
       watcher.depend();
     }
     return watcher.value
   }
 }
}

// fn是用户给计算属性定义的get函数
// 每次访问计算属性,都会再执行一遍fn函数
function createGetterInvoker(fn) {
 return function computedGetter () {
  // 计算属性getter函数
   return fn.call(this, this)
 }
}
