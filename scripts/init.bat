echo Copy .env template

move .env.template .env
copy /Y BLANK_README.md README.md 

echo Replacing repo_name in README.md with %repo%
powershell -Command "(gc README.md) -replace 'repo_name', '%repo%' | Out-File -encoding ASCII README.md"

echo Installing Dependencies
npm i

git add -u
git commit -m "Initial Commit"

echo Pushing new repository %repo% to github. 
git push -u origin master

cd %repo%

echo Repository set up. You can run 'npm start'