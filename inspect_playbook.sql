select * from alpha_engine_playbooks 
where ticker = 'NA' 
   or ticker ~ '[가-힣]' -- Korean characters
   or length(ticker) > 6 
   or ticker = 'undefined'
limit 20;
