export const languages = [
  { id: 63, label: "JavaScript", monaco: "javascript", starter: "console.log('Hello from CodeOrbit');" },
  { id: 71, label: "Python", monaco: "python", starter: "print('Hello from CodeOrbit')" },
  { id: 54, label: "C++", monaco: "cpp", starter: "#include <iostream>\nint main(){ std::cout << \"Hello from CodeOrbit\"; }" },
  { id: 62, label: "Java", monaco: "java", starter: "class Main { public static void main(String[] args) { System.out.println(\"Hello from CodeOrbit\"); } }" },
  { id: 50, label: "C", monaco: "c", starter: "#include <stdio.h>\nint main(){ printf(\"Hello from CodeOrbit\"); return 0; }" },
  { id: 74, label: "TypeScript", monaco: "typescript", starter: "const message: string = 'Hello from CodeOrbit';\nconsole.log(message);" }
];

export function languageByMonaco(monaco: string) {
  return languages.find((language) => language.monaco === monaco) ?? languages[0];
}
