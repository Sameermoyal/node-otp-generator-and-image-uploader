const express =require('express')
const mongoose =require('mongoose')
const bcrypt =require('bcrypt')
const jwt=require('jsonwebtoken')
const fileUpload =require('express-fileupload')
const cloudinary =require('cloudinary')

const app=express();
const port =3000;
const secret_key='yubuyb hbhj bhjbjh'
const userSchema = mongoose.Schema(
    {
        name:{type:String,required:true},
        email:{type:String,required:true,unique:true},
        password:{type:String,required:true},
        otp:{type:String,default:null},
    }
)

cloudinary.config({
    cloud_name: 'dqfhn7rw3',
    api_key: '382695276612379', 
    api_secret:'3XWIpGNiRSe2K2Cs2t9-fUtPPY0', 
  });

app.use(express.json())
app.use(express.urlencoded())
app.use(fileUpload({
    useTempFiles:true
}))
const userModel =mongoose.model('user',userSchema);
mongoose.connect('mongodb://localhost:27017/test').then(()=>{console.log("mongodb connected")}).catch((error)=>{console.log("error to  connection in mongodb",error)})

app.post('/signup',async(req,res)=>{
   try{
    const {name,email,password}=req.body;

    if(!name || !email || !password){
        return res.status(400).json({message:"'all fields are required!'"})
    }

    const existingUser =await userModel.findOne({email})
    if(existingUser){
        return res.status(400).json({message:"'you already registerd'"})
    }

    const salt=bcrypt.genSaltSync(10)
    const hashPassword=bcrypt.hashSync(password,salt)
    

    const userData ={name,email,password:hashPassword}
    const newUser =  new userModel(userData)
    await newUser.save()

    return res.status(200).json({message:"'user successfully created'",newUser})
   }catch(err){
    return res.status(500).json({message:"'server error '",err})
   }
}) 


app.post('/login',async(req,res)=>{
   try{
    const {email,password}=req.body;
   
    const existingUser =await userModel.findOne({email})
    if(! existingUser){
        return res.status(400).json({message:"'you  not  registerd, please signup'"})
    }
    const dbPassword =existingUser.password;
    const match=await bcrypt.compare(password,dbPassword)
    
    if(! match){
        return res.status(400).json({message:"'password is wrong'"})
    }

    const otp =Math.floor(Math.random()*1000000).toString()
    existingUser.otp=otp;
    await existingUser.save()

    const token =jwt.sign({id:existingUser._id},secret_key,{expiresIn:'1m'})

    return res.status(200).json({message:"'user successfully login'",token})
   }catch(err){
    return res.status(500).json({message:"'server error '",err})
   }
})  
app.post('/verify',async(req,res)=>{
   try{
    const {email,otp}=req.body;
   if(!email || !otp){
    return res.status(400).json({message:"'both email and otp  fields required'"})
   }

    const existingUser =await userModel.findOne({email})
    if(! existingUser){
        return res.status(400).json({message:"'user not found'"})
    }
    const dbPassword =existingUser.otp;
    
    if(!otp==existingUser.otp){
        return res.status(400).json({message:"'your otp is invalid'"})
    }
   
    existingUser.otp=null 
    await existingUser.save()
    

    const token =jwt.sign({id:existingUser._id},secret_key,{expiresIn:'1m'})

    return res.status(200).json({message:"'user successfully verify'",token})
   }catch(err){
    return res.status(500).json({message:"'server error '",err})
   }
})  
app.patch('/update',async(req,res)=>{
   try{
    const {email,name,password}=req.body;
   if(!email || !name){
    return res.status(400).json({message:"'both email and  name fields required'"})
   }

    const existingUser =await userModel.findOne({email})
    if(! existingUser){
        return res.status(400).json({message:"'user not found'"})
    }
   
    
    if(!name==existingUser.name){
        return res.status(400).json({message:"'your name is invalid'"})
    }
   
     const salt=bcrypt.genSaltSync(10);
     const hashPassword=bcrypt.hashSync(password,salt)
    
    const user=await userModel.findByIdAndUpdate(existingUser._id,{password:hashPassword})
    

    const token =jwt.sign({id:existingUser._id},secret_key,{expiresIn:'1m'})

    return res.status(200).json({message:"'user successfully update'",user,token})
   }catch(err){
    return res.status(500).json({message:"'server error '",err})
   }
})  


app.post('/upload',async(req,res)=>{
    try{
        console.log(req.files)
        if(!req.files || !req.files.image){
            return res.status(400).json({message:"'image is not uploaded '"})
        }

        const file=req.files.image;
        const result =await cloudinary.uploader.upload(file.tempFilePath)
        return res.status(200).json({message:"'file upload successfully '",imageurl:result.secure_url})

    }catch(error){
        return res.status(500).json({message:"'server error '",error})
    }
})
app.post('/verifyToken',async(req,res)=>{
    try{    
          const token =req.headers.authorization;
          if(!token){
            return res.status(400).json({message:"'not token  provided '"})

          }
          const splitToken =token.split(" ")[1]
          const decode =jwt.verify(splitToken,secret_key)
          console.log("decode>>>>",decode)
          if(!decode){
            return res.status(400).json({message:"'invalid token  '"})

          }
          const user=await userModel.findById(decode.id);
          if(!user){
              return res.status(401).json({message:'User NOt found'})
          }
          
       
               return res.status(200).json({message:"'authentication successfully '"})

    }catch(error){
        return res.status(500).json({message:"'server error '",error})
    }
})



const loginCountSchema=new mongoose.Schema({
   user:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'user',
    required:true
   },
   loginCount:{
    type:Number,
    default:0
   }
})


const loginCountModel =mongoose.model('loginCount',loginCountSchema)

app.post('/register',async(req,res)=>{
    try{
        const{name,email,password}=req.body;

    if(!name || !email || !password){
        res.status(400).json({message:"all fields name,email, password required"})
    }
    
    const newUser = userModel({name,email,password})
    await newUser.save();
    
    const newLoginUser= loginCountModel({user:newUser._id})
    await newLoginUser.save()

    res.status(200).json({message:"user successfully register",newUser,newLoginUser})
  }catch(error){
        res.status(500).json({message:"error to newUser register ",error})
    }
})

app.post('/userLogin',async(req,res)=>{
    const{email,password}=req.body;
    if(!email){
        res.status(400).json({message:"email required"})
    }
    const user=await userModel.findOne({email});
    if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
    const dbPassword=user.password;

    if(password != dbPassword){
        res.status(400).json({message:"password invalid"})
    }
    const loginCounts=await loginCountModel.findOne({user:user._id})
    loginCounts.loginCount+=1;
    await loginCounts.save()

    res.status(200).json({message:"login successfully",loginCount:loginCounts.loginCount})
})


app.get("/getAll",async(req,res)=>{
   try{const users=await loginCountModel.find().populate('user')

   res.status(200).json(users)}catch(error){res.status(500).json({message:"error >>>",error})}
})


app.listen(port,()=>{console.log("server run this port ",port)})
